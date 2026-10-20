import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import app from "../src/app.js";
import { db, indexes, closeDb } from "../src/db.js";
import { hashToken } from "../src/auth.js";
let repl: MongoMemoryReplSet;
let adminToken: string;
let a: string;
let b: string;
let aId: string;
let bId: string;
let spotId: string;
let zoneId: string;
let streetId: string;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
async function register(email: string) {
  const r = await request(app).post("/api/auth/register").send({
    email,
    password: "correct horse battery staple",
    firstName: "Test",
    lastName: "Driver",
  });
  assert.equal(r.status, 201, r.text);
  return r.body;
}
before(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = repl.getUri();
  process.env.MONGODB_DB = "smartparking_test";
  process.env.APP_ORIGIN = "http://localhost:5173";
  const legacyDb = await db();
  await legacyDb
    .collection("streets")
    .insertOne({
      id: "legacy-fixture",
      name: "Legacy Road",
      city: "Legacy City",
      enabled: true,
      image: "",
    });
  await legacyDb
    .collection("streets")
    .createIndex({ city: 1, name: 1 }, { unique: true });
  await indexes();
  const admin = await register("admin@example.test");
  await (await db())
    .collection("users")
    .updateOne({ id: admin.user.id }, { $set: { role: "admin" } });
  adminToken = admin.token;
  const userA = await register("a@example.test"),
    userB = await register("b@example.test");
  a = userA.token;
  b = userB.token;
  aId = userA.user.id;
  bId = userB.user.id;
  for (const id of [aId, bId]) {
    const r = await request(app)
      .post(`/api/admin/users/${id}/credit`)
      .set(auth(adminToken))
      .send({ amountCents: 10000, reason: "Test prepaid credit" });
    assert.equal(r.status, 200, r.text);
  }
  let r = await request(app)
    .post("/api/admin/streets")
    .set(auth(adminToken))
    .send({ name: "Jaffa", city: "Jerusalem" });
  assert.equal(r.status, 201, r.text);
  streetId = r.body.item.id;
  r = await request(app)
    .post("/api/admin/zones")
    .set(auth(adminToken))
    .send({ streetId, name: "Zone 1", distance: 0, hourlyRate: 2 });
  assert.equal(r.status, 201, r.text);
  zoneId = r.body.item.id;
  r = await request(app)
    .post("/api/admin/spots")
    .set(auth(adminToken))
    .send({ zoneId, name: "J1-01", distance: 0 });
  assert.equal(r.status, 201, r.text);
  spotId = r.body.item.id;
});
after(async () => {
  await closeDb();
  await repl?.stop();
});
test("authentication, CSRF protection, permissions, and input validation", async () => {
  assert.equal((await request(app).get("/api/streets")).status, 401);
  assert.equal(
    (await request(app).get("/api/admin/overview").set(auth(a))).status,
    403,
  );
  assert.equal(
    (await request(app).post("/api/admin/spots").set(auth(a)).send({})).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/auth/login")
        .send({ email: "a@example.test", password: "wrong" })
    ).status,
    401,
  );
  const login = await request(app).post("/api/auth/login").send({
    email: "A@example.test",
    password: "correct horse battery staple",
  });
  assert.equal(login.status, 200);
  assert.ok(login.headers["set-cookie"][0].includes("HttpOnly"));
  assert.ok(!login.body.user.passwordHash);
  assert.equal(
    (
      await request(app)
        .post("/api/auth/logout")
        .set("Origin", "https://evil.test")
        .set("Cookie", login.headers["set-cookie"])
        .set("Authorization", "Basic invalid")
        .send({})
    ).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/reservations")
        .set(auth(a))
        .send({ spotId, hours: -1, vehiclePlate: "123" })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/admin/zones")
        .set(auth(adminToken))
        .send({ streetId, name: "Bad zone", distance: 0, hourlyRate: 2.123 })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(app).post("/api/auth/register").send({
        email: "x@test.com",
        password: "short",
        firstName: "X",
        lastName: "Y",
      })
    ).status,
    400,
  );
  const user = await (await db()).collection("users").findOne({ id: aId });
  assert.notEqual(user!.passwordHash, "correct horse battery staple");
});
test("one-time admin invitation is email-bound, private, and consumed atomically", async () => {
  const d = await db();
  await d.collection("invitations").insertOne({
    email: "invited@example.test",
    tokenHash: hashToken("private-invite"),
    expiresAt: new Date(Date.now() + 60000),
  });
  const body = {
    email: "invited@example.test",
    password: "a long secure password",
    firstName: "Invite",
    lastName: "Admin",
  };
  assert.equal(
    (await request(app).post("/api/auth/register").send(body)).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/auth/register")
        .send({ ...body, setupToken: "wrong" })
    ).status,
    403,
  );
  const r = await request(app)
    .post("/api/auth/register")
    .send({ ...body, setupToken: "private-invite" });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.body.user.role, "admin");
  assert.equal(
    await d.collection("invitations").countDocuments({ email: body.email }),
    0,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/auth/register")
        .send({ ...body, setupToken: "private-invite" })
    ).status,
    403,
  );
});
test("concurrent bookings charge one driver once, prohibit ownership theft, and refund once", async () => {
  const body = { spotId, vehiclePlate: "123-45", hours: 2 };
  const results = await Promise.all([
    request(app).post("/api/reservations").set(auth(a)).send(body),
    request(app).post("/api/reservations").set(auth(b)).send(body),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const winner = results[0].status === 201 ? a : b,
    loser = winner === a ? b : a;
  const reservation = results.find((r) => r.status === 201)!.body.reservation;
  assert.equal(
    (
      await request(app)
        .post(`/api/reservations/${reservation.id}/end`)
        .set(auth(loser))
        .send({ status: "cancelled" })
    ).status,
    404,
  );
  assert.equal(
    (
      await request(app)
        .post(`/api/admin/spots/${spotId}`)
        .set(auth(winner))
        .send({})
    ).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .patch(`/api/admin/spots/${spotId}`)
        .set(auth(adminToken))
        .send({ enabled: false })
    ).status,
    409,
  );
  const users = await (
    await db()
  )
    .collection("users")
    .find({ id: { $in: [aId, bId] } })
    .toArray();
  assert.equal(
    users.reduce((s, u) => s + u.balanceCents, 0),
    19600,
  );
  assert.equal(
    (
      await request(app)
        .post(`/api/reservations/${reservation.id}/end`)
        .set(auth(winner))
        .send({ status: "cancelled" })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .post(`/api/reservations/${reservation.id}/end`)
        .set(auth(winner))
        .send({ status: "cancelled" })
    ).status,
    404,
  );
  const refunded = await (
    await db()
  )
    .collection("users")
    .find({ id: { $in: [aId, bId] } })
    .toArray();
  assert.equal(
    refunded.reduce((s, u) => s + u.balanceCents, 0),
    20000,
  );
  assert.equal(
    (await (await db()).collection("spots").findOne({ id: spotId }))!
      .reservationId,
    null,
  );
});
test("balance, occupied spots, renewal, arrival, expiry and session revocation", async () => {
  const d = await db();
  await d
    .collection("users")
    .updateOne({ id: aId }, { $set: { balanceCents: 0 } });
  assert.equal(
    (
      await request(app)
        .post("/api/reservations")
        .set(auth(a))
        .send({ spotId, hours: 1, vehiclePlate: "ABC" })
    ).status,
    409,
  );
  assert.equal(
    (await d.collection("spots").findOne({ id: spotId }))!.reservationId,
    null,
  );
  await d
    .collection("users")
    .updateOne({ id: aId }, { $set: { balanceCents: 10000 } });
  await d
    .collection("spots")
    .updateOne({ id: spotId }, { $set: { occupied: true } });
  assert.equal(
    (
      await request(app)
        .post("/api/reservations")
        .set(auth(a))
        .send({ spotId, hours: 1, vehiclePlate: "ABC" })
    ).status,
    409,
  );
  await d
    .collection("spots")
    .updateOne({ id: spotId }, { $set: { occupied: false } });
  let r = await request(app)
    .post("/api/reservations")
    .set(auth(a))
    .send({ spotId, hours: 1, vehiclePlate: "ABC" });
  assert.equal(r.status, 201, r.text);
  const id = r.body.reservation.id;
  assert.equal(
    (
      await request(app)
        .post(`/api/reservations/${id}/renew`)
        .set(auth(a))
        .send({ hours: 2 })
    ).status,
    200,
  );
  assert.equal((await d.collection("reservations").findOne({ id }))!.hours, 3);
  assert.equal(
    (await d.collection("users").findOne({ id: aId }))!.balanceCents,
    9400,
  );
  assert.equal(
    (
      await request(app)
        .post(`/api/reservations/${id}/confirm`)
        .set(auth(a))
        .send({})
    ).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .post(`/api/reservations/${id}/end`)
        .set(auth(a))
        .send({ status: "cancelled" })
    ).status,
    200,
  );
  assert.equal(
    (await d.collection("users").findOne({ id: aId }))!.balanceCents,
    9400,
    "Confirmed time is not refunded",
  );
  r = await request(app)
    .post("/api/reservations")
    .set(auth(a))
    .send({ spotId, hours: 1, vehiclePlate: "ABC" });
  assert.equal(r.status, 201, r.text);
  const expiredId = r.body.reservation.id;
  await d
    .collection("reservations")
    .updateOne(
      { id: expiredId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
  r = await request(app).get(`/api/spots?zoneId=${zoneId}`).set(auth(b));
  assert.equal(r.status, 200);
  assert.equal(r.body.spots[0].reservationId, null);
  assert.equal(
    (await d.collection("reservations").findOne({ id: expiredId }))!.status,
    "completed",
  );
  const logged = await request(app).post("/api/auth/login").send({
    email: "b@example.test",
    password: "correct horse battery staple",
  });
  const token = logged.body.token;
  assert.equal(
    (await request(app).post("/api/auth/logout").set(auth(token)).send({}))
      .status,
    200,
  );
  assert.equal(
    (await request(app).get("/api/auth/me").set(auth(token))).status,
    401,
  );
});

test("partial admin edits preserve disabled state and unrelated fields", async () => {
  const r = await request(app)
    .patch(`/api/admin/spots/${spotId}`)
    .set(auth(adminToken))
    .send({ enabled: false });
  assert.equal(r.status, 200, r.text);
  const updated = await request(app)
    .patch(`/api/admin/spots/${spotId}`)
    .set(auth(adminToken))
    .send({ occupied: true });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.item.enabled, false);
  const street = await request(app)
    .patch(`/api/admin/streets/${streetId}`)
    .set(auth(adminToken))
    .send({ image: "https://example.com/map.jpg", enabled: false });
  assert.equal(street.status, 200);
  const renamed = await request(app)
    .patch(`/api/admin/streets/${streetId}`)
    .set(auth(adminToken))
    .send({ name: "Jaffa Street" });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.item.enabled, false);
  assert.equal(renamed.body.item.image, "https://example.com/map.jpg");
});

test("one driver cannot reserve two spaces or renew another driver booking", async () => {
  const d = await db();
  await d
    .collection("streets")
    .updateOne({ id: streetId }, { $set: { enabled: true } });
  await d
    .collection("spots")
    .updateOne({ id: spotId }, { $set: { enabled: true, occupied: false } });
  const second = await request(app)
    .post("/api/admin/spots")
    .set(auth(adminToken))
    .send({ zoneId, name: "J1-02", distance: 5 });
  assert.equal(second.status, 201);
  const booked = await request(app)
    .post("/api/reservations")
    .set(auth(a))
    .send({ spotId, hours: 1, vehiclePlate: "ABC" });
  assert.equal(booked.status, 201, booked.text);
  const before = await d.collection("users").findOne({ id: aId });
  const conflict = await request(app)
    .post("/api/reservations")
    .set(auth(a))
    .send({ spotId: second.body.item.id, hours: 1, vehiclePlate: "ABC" });
  assert.equal(conflict.status, 409);
  assert.equal(
    (await d.collection("users").findOne({ id: aId }))!.balanceCents,
    before!.balanceCents,
  );
  assert.equal(
    (await d.collection("spots").findOne({ id: second.body.item.id }))!
      .reservationId,
    null,
  );
  assert.equal(
    (
      await request(app)
        .post(`/api/reservations/${booked.body.reservation.id}/renew`)
        .set(auth(b))
        .send({ hours: 1 })
    ).status,
    404,
  );
  assert.equal(
    (
      await request(app)
        .post(`/api/reservations/${booked.body.reservation.id}/end`)
        .set(auth(adminToken))
        .send({ status: "cancelled" })
    ).status,
    200,
  );
});

test("international locations validate metadata and distinguish matching street/city names by country", async () => {
  const create = (body: object) =>
    request(app).post("/api/admin/streets").set(auth(adminToken)).send(body);
  const base = {
    name: "Main Street",
    city: "Springfield",
    currency: "USD",
    timeZone: "America/New_York",
    countryCode: "US",
  };
  const first = await create(base);
  assert.equal(first.status, 201, first.text);
  const second = await create({
    ...base,
    countryCode: "GB",
    currency: "GBP",
    timeZone: "Europe/London",
  });
  assert.equal(second.status, 201, second.text);
  assert.equal((await create(base)).status, 409);
  assert.equal(
    (await create({ ...base, name: "Invalid", currency: "FAKE" })).status,
    400,
  );
  assert.equal(
    (await create({ ...base, name: "Invalid", timeZone: "Moon/Sea" })).status,
    400,
  );
  assert.equal(
    (await create({ ...base, name: "Invalid", latitude: 15 })).status,
    400,
  );
  assert.equal(
    (await create({ ...base, name: "Invalid", countryCode: "XX" })).status,
    400,
  );
  const unicode = await create({
    name: "شارع الاستقلال",
    city: "الخليل",
    countryCode: "PS",
    currency: "ILS",
    timeZone: "Asia/Hebron",
    latitude: 31.53,
    longitude: 35.1,
  });
  assert.equal(unicode.status, 201, unicode.text);
  const filtered = await request(app)
    .get("/api/streets?city=Springfield&countryCode=GB")
    .set(auth(a));
  assert.equal(filtered.status, 200);
  assert.equal(filtered.body.streets.length, 1);
  assert.equal(filtered.body.streets[0].currency, "GBP");
  const cities = await request(app).get("/api/cities").set(auth(a));
  assert.equal(cities.status, 200);
  assert.equal(
    cities.body.cities.filter((c: any) => c.name === "Springfield").length,
    2,
  );
  assert.equal(
    (
      await request(app)
        .patch(`/api/admin/streets/${first.body.item.id}`)
        .set(auth(adminToken))
        .send({ currency: "EUR" })
    ).status,
    409,
  );
});

test("currency wallets, precision, snapshots, renewals and refunds never mix funds", async () => {
  const d = await db();
  for (const [currency, rate, amount, digits] of [
    ["USD", 2.5, 1000, 2],
    ["JPY", 300, 1000, 0],
    ["KWD", 0.125, 1000, 3],
  ] as const) {
    const street = await request(app)
      .post("/api/admin/streets")
      .set(auth(adminToken))
      .send({
        name: `International ${currency}`,
        city: "Global Test",
        countryCode: "US",
        currency,
        timeZone: "Pacific/Auckland",
      });
    assert.equal(street.status, 201, street.text);
    const zone = await request(app)
      .post("/api/admin/zones")
      .set(auth(adminToken))
      .send({
        streetId: street.body.item.id,
        name: "Zone A",
        distance: 0,
        hourlyRate: rate,
      });
    assert.equal(zone.status, 201, zone.text);
    const invalidRate = rate + 10 ** -(digits + 1);
    assert.equal(
      (
        await request(app)
          .patch(`/api/admin/zones/${zone.body.item.id}`)
          .set(auth(adminToken))
          .send({ hourlyRate: invalidRate })
      ).status,
      400,
    );
    const spot = await request(app)
      .post("/api/admin/spots")
      .set(auth(adminToken))
      .send({ zoneId: zone.body.item.id, name: "A-01", distance: 10 });
    assert.equal(spot.status, 201, spot.text);
    const book = () =>
      request(app).post("/api/reservations").set(auth(a)).send({
        spotId: spot.body.item.id,
        hours: 1,
        vehiclePlate: "GLOBAL-1",
      });
    const ilsBefore = (await d.collection("users").findOne({ id: aId }))!
      .balanceCents;
    assert.equal(
      (await book()).status,
      409,
      "ILS cannot pay for another currency",
    );
    const credit = await request(app)
      .post(`/api/admin/users/${aId}/credit`)
      .set(auth(adminToken))
      .send({ amountCents: amount, currency, reason: "International fixture" });
    assert.equal(credit.status, 200);
    const booked = await book();
    assert.equal(booked.status, 201, booked.text);
    const r = booked.body.reservation;
    assert.equal(r.currency, currency);
    assert.equal(r.timeZone, "Pacific/Auckland");
    assert.equal(r.paidCents, Math.round(rate * 10 ** digits));
    await request(app)
      .patch(`/api/admin/zones/${zone.body.item.id}`)
      .set(auth(adminToken))
      .send({ hourlyRate: rate * 2 });
    await request(app)
      .patch(`/api/admin/streets/${street.body.item.id}`)
      .set(auth(adminToken))
      .send({ timeZone: "UTC" });
    const renewed = await request(app)
      .post(`/api/reservations/${r.id}/renew`)
      .set(auth(a))
      .send({ hours: 1 });
    assert.equal(renewed.status, 200, renewed.text);
    const saved = await d.collection("reservations").findOne({ id: r.id });
    assert.equal(saved!.paidCents, r.paidCents * 2);
    assert.equal(saved!.timeZone, "Pacific/Auckland");
    const cancelled = await request(app)
      .post(`/api/reservations/${r.id}/end`)
      .set(auth(a))
      .send({ status: "cancelled" });
    assert.equal(cancelled.status, 200, cancelled.text);
    const me = await request(app).get("/api/auth/me").set(auth(a));
    assert.equal(me.body.user.balances[currency], amount);
    assert.equal(me.body.user.balanceCents, ilsBefore);
    assert.equal(
      await d
        .collection("ledger")
        .countDocuments({ reservationId: r.id, currency }),
      3,
    );
  }
});

test("legacy location migration preserves data and installs country-scoped uniqueness", async () => {
  const d = await db();
  const street = await d
    .collection("streets")
    .findOne({ id: "legacy-fixture" });
  assert.equal(street!.countryCode, "");
  assert.equal(street!.name, "Legacy Road");
  const indexes = await d.collection("streets").listIndexes().toArray();
  assert.ok(indexes.some((i) => i.name === "countryCode_1_city_1_name_1"));
  assert.ok(!indexes.some((i) => i.name === "city_1_name_1"));
  const response = await request(app)
    .get("/api/streets?city=Legacy%20City")
    .set(auth(a));
  assert.equal(response.status, 200);
  assert.equal(response.body.streets[0].currency, "ILS");
  assert.equal(response.body.streets[0].timeZone, "UTC");
});
