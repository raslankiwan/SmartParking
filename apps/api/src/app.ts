import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, client, indexes } from "./db.js";
import {
  authenticate,
  admin,
  createSession,
  hashPassword,
  verifyPassword,
  publicUser,
  hashToken,
} from "./auth.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "32kb" }), cookieParser());
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    !req.is("application/json")
  )
    return res
      .status(415)
      .json({ status: "failed", error: "Send application/json" });
  const origin = req.headers.origin;
  if (origin && !req.headers.authorization?.startsWith("Bearer ")) {
    const allowed = [
      process.env.APP_ORIGIN,
      process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : null,
      process.env.NODE_ENV !== "production" ? "http://127.0.0.1:5173" : null,
      process.env.NODE_ENV !== "production" ? "http://localhost:5173" : null,
    ].filter(Boolean);
    if (!allowed.includes(origin))
      return res
        .status(403)
        .json({ status: "failed", error: "Origin not allowed" });
  }
  next();
});
let ready: Promise<void> | undefined;
app.use("/api", async (_req, _res, next) => {
  ready ??= indexes().catch((e) => {
    ready = undefined;
    throw e;
  });
  await ready;
  next();
});
const ok = (res: express.Response, data: object = {}) =>
  res.json({ status: "success", ...data });
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}
const idSchema = z.string().uuid();
const emailSchema = z
  .email()
  .max(254)
  .transform((s) => s.toLowerCase());
const passwordSchema = z.string().min(10).max(128);
const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  phone: z.string().trim().max(30).default(""),
  setupToken: z.string().max(100).optional(),
});
async function throttle(email: string) {
  const d = await db();
  const bucket = Math.floor(Date.now() / 900000);
  const key = hashToken(`${email}:${bucket}`);
  const attempt = await d.collection("authAttempts").findOneAndUpdate(
    { _id: key as any },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(Date.now() + 1800000) },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (attempt!.count > 20)
    fail(429, "Too many attempts. Try again in 15 minutes");
}
app.get("/api/health", async (_req, res) => {
  await (await db()).command({ ping: 1 });
  ok(res, { service: "smartparking-api", database: "connected" });
});
app.post("/api/auth/register", async (req, res) => {
  const input = registerSchema.parse(req.body);
  await throttle(input.email);
  const d = await db();
  const session = (await client()).startSession();
  let user: any;
  const passwordHash = await hashPassword(input.password);
  try {
    await session.withTransaction(async () => {
      const invite = await d
        .collection("invitations")
        .findOne({ email: input.email }, { session });
      if (
        invite &&
        (!input.setupToken ||
          hashToken(input.setupToken) !== invite.tokenHash ||
          invite.expiresAt < new Date())
      )
        fail(403, "Use your administrator setup link to create this account");
      if (input.setupToken && !invite)
        fail(403, "This setup link is invalid or already used");
      user = {
        id: randomUUID(),
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: invite ? "admin" : "driver",
        balanceCents: 0,
        createdAt: new Date(),
      };
      await d.collection("users").insertOne(user, { session });
      if (invite)
        await d
          .collection("invitations")
          .deleteOne({ _id: invite._id }, { session });
    });
  } finally {
    await session.endSession();
  }
  const token = await createSession(user.id, res);
  res.status(201);
  ok(res, { user: publicUser(user), token });
});
app.post("/api/auth/login", async (req, res) => {
  const input = z
    .object({ email: emailSchema, password: z.string().min(1).max(128) })
    .parse(req.body);
  await throttle(input.email);
  const user = await (await db())
    .collection("users")
    .findOne({ email: input.email });
  // Always perform password derivation, including for an unknown email.
  const valid = await verifyPassword(
    input.password,
    user?.passwordHash || "00000000000000000000000000000000:" + "00".repeat(64),
  );
  if (!user || !valid) fail(401, "Email or password is incorrect");
  const token = await createSession(user.id, res);
  ok(res, { user: publicUser(user), token });
});
app.post("/api/auth/logout", authenticate, async (req, res) => {
  await (await db())
    .collection("sessions")
    .deleteOne({ tokenHash: req.sessionHash });
  res.clearCookie("sp_session", { path: "/" });
  ok(res);
});
app.get("/api/auth/me", authenticate, (req, res) =>
  ok(res, { user: req.user }),
);
app.get("/api/streets", authenticate, async (_req, res) =>
  ok(res, {
    streets: await (
      await db()
    )
      .collection("streets")
      .find({ enabled: true }, { projection: { _id: 0 } })
      .sort({ name: 1 })
      .toArray(),
  }),
);
app.get("/api/zones", authenticate, async (req, res) => {
  const streetId = idSchema.parse(req.query.streetId);
  const d = await db();
  if (!(await d.collection("streets").findOne({ id: streetId, enabled: true })))
    fail(404, "Street not found");
  ok(res, {
    zones: await d
      .collection("zones")
      .find({ streetId, enabled: true }, { projection: { _id: 0 } })
      .sort({ distance: 1 })
      .toArray(),
  });
});
app.get("/api/spots", authenticate, async (req, res) => {
  await expireReservations();
  const zoneId = idSchema.parse(req.query.zoneId);
  const d = await db();
  const zone = await d
    .collection("zones")
    .findOne({ id: zoneId, enabled: true });
  if (
    !zone ||
    !(await d
      .collection("streets")
      .findOne({ id: zone.streetId, enabled: true }))
  )
    fail(404, "Zone not found");
  ok(res, {
    spots: await d
      .collection("spots")
      .find({ zoneId, enabled: true }, { projection: { _id: 0 } })
      .sort({ name: 1 })
      .toArray(),
  });
});
app.get("/api/reservations", authenticate, async (req, res) => {
  await expireReservations();
  ok(res, {
    reservations: await (
      await db()
    )
      .collection("reservations")
      .find({ userId: req.user!.id }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray(),
  });
});
app.post("/api/reservations", authenticate, async (req, res) => {
  await expireReservations();
  const input = z
    .object({
      spotId: idSchema,
      vehiclePlate: z.string().trim().min(2).max(20),
      hours: z.number().int().min(1).max(24),
    })
    .parse(req.body);
  const d = await db(),
    session = (await client()).startSession();
  let reservation: any;
  try {
    await session.withTransaction(async () => {
      const spot = await d.collection("spots").findOne(
        {
          id: input.spotId,
          enabled: true,
          occupied: false,
          reservationId: null,
        },
        { session },
      );
      if (!spot) fail(409, "This spot is no longer available");
      const zone = await d
        .collection("zones")
        .findOne({ id: spot.zoneId, enabled: true }, { session });
      if (
        !zone ||
        !(await d
          .collection("streets")
          .findOne({ id: zone.streetId, enabled: true }, { session }))
      )
        fail(409, "This parking area is unavailable");
      reservation = {
        id: randomUUID(),
        userId: req.user!.id,
        spotId: spot.id,
        zoneId: zone.id,
        vehiclePlate: input.vehiclePlate.toUpperCase(),
        status: "active",
        createdAt: new Date(),
        hourlyRate: zone.hourlyRate,
        hours: input.hours,
        confirmed: false,
        expiresAt: new Date(Date.now() + input.hours * 3600000),
        paidCents: Math.round(zone.hourlyRate * 100) * input.hours,
      };
      const debit = await d
        .collection("users")
        .updateOne(
          { id: req.user!.id, balanceCents: { $gte: reservation.paidCents } },
          { $inc: { balanceCents: -reservation.paidCents } },
          { session },
        );
      if (debit.modifiedCount !== 1 && reservation.paidCents > 0)
        fail(409, "Insufficient balance. Ask an administrator to add credits");
      await d.collection("ledger").insertOne(
        {
          id: randomUUID(),
          userId: req.user!.id,
          reservationId: reservation.id,
          amountCents: -reservation.paidCents,
          reason: "booking",
          createdAt: new Date(),
        },
        { session },
      );
      const updated = await d
        .collection("spots")
        .updateOne(
          { id: spot.id, enabled: true, occupied: false, reservationId: null },
          { $set: { reservationId: reservation.id } },
          { session },
        );
      if (updated.modifiedCount !== 1)
        fail(409, "This spot is no longer available");
      await d.collection("reservations").insertOne(reservation, { session });
    });
  } finally {
    await session.endSession();
  }
  res.status(201);
  ok(res, { reservation: strip(reservation) });
});
app.post("/api/reservations/:id/end", authenticate, async (req, res) => {
  await expireReservations();
  const id = idSchema.parse(req.params.id);
  const { status } = z
    .object({ status: z.enum(["completed", "cancelled"]) })
    .parse(req.body);
  const d = await db(),
    session = (await client()).startSession();
  try {
    await session.withTransaction(async () => {
      const filter: any = { id, status: "active" };
      if (req.user!.role !== "admin") filter.userId = req.user!.id;
      const reservation = await d
        .collection("reservations")
        .findOneAndUpdate(
          filter,
          { $set: { status, endedAt: new Date() } },
          { session, returnDocument: "after" },
        );
      if (!reservation) fail(404, "Active reservation not found");
      if (status === "cancelled" && !reservation.confirmed) {
        await d
          .collection("users")
          .updateOne(
            { id: reservation.userId },
            { $inc: { balanceCents: reservation.paidCents } },
            { session },
          );
        await d.collection("ledger").insertOne(
          {
            id: randomUUID(),
            userId: reservation.userId,
            reservationId: id,
            amountCents: reservation.paidCents,
            reason: "unconfirmed cancellation refund",
            createdAt: new Date(),
          },
          { session },
        );
      }
      await d
        .collection("spots")
        .updateOne(
          { id: reservation.spotId, reservationId: id },
          { $set: { reservationId: null } },
          { session },
        );
    });
  } finally {
    await session.endSession();
  }
  ok(res);
});
app.post("/api/reservations/:id/confirm", authenticate, async (req, res) => {
  await expireReservations();
  const id = idSchema.parse(req.params.id);
  const result = await (await db()).collection("reservations").updateOne(
    {
      id,
      userId: req.user!.id,
      status: "active",
      expiresAt: { $gt: new Date() },
    },
    { $set: { confirmed: true } },
  );
  if (!result.matchedCount) fail(404, "Active reservation not found");
  ok(res);
});
app.post("/api/reservations/:id/renew", authenticate, async (req, res) => {
  await expireReservations();
  const id = idSchema.parse(req.params.id);
  const { hours } = z
    .object({ hours: z.number().int().min(1).max(24) })
    .parse(req.body);
  const d = await db(),
    session = (await client()).startSession();
  try {
    await session.withTransaction(async () => {
      const reservation = await d.collection("reservations").findOne(
        {
          id,
          userId: req.user!.id,
          status: "active",
          expiresAt: { $gt: new Date() },
        },
        { session },
      );
      if (!reservation) fail(404, "Active reservation not found");
      if (reservation.hours + hours > 168)
        fail(400, "A reservation cannot exceed 7 days");
      const amount = Math.round(reservation.hourlyRate * 100) * hours;
      const debit = await d
        .collection("users")
        .updateOne(
          { id: req.user!.id, balanceCents: { $gte: amount } },
          { $inc: { balanceCents: -amount } },
          { session },
        );
      if (!debit.modifiedCount && amount > 0) fail(409, "Insufficient balance");
      await d.collection("reservations").updateOne(
        { id, status: "active" },
        {
          $inc: { hours, paidCents: amount },
          $set: {
            expiresAt: new Date(
              reservation.expiresAt.getTime() + hours * 3600000,
            ),
          },
        },
        { session },
      );
      await d.collection("ledger").insertOne(
        {
          id: randomUUID(),
          userId: req.user!.id,
          reservationId: id,
          amountCents: -amount,
          reason: "renewal",
          createdAt: new Date(),
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  ok(res);
});
app.use("/api/admin", authenticate, admin);
app.post("/api/admin/users/:id/credit", async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { amountCents, reason } = z
    .object({
      amountCents: z.number().int().min(1).max(100000),
      reason: z.string().trim().min(3).max(200),
    })
    .parse(req.body);
  const d = await db(),
    session = (await client()).startSession();
  try {
    await session.withTransaction(async () => {
      const result = await d
        .collection("users")
        .updateOne(
          { id },
          { $inc: { balanceCents: amountCents } },
          { session },
        );
      if (!result.matchedCount) fail(404, "User not found");
      await d.collection("ledger").insertOne(
        {
          id: randomUUID(),
          userId: id,
          adminId: req.user!.id,
          amountCents,
          reason,
          createdAt: new Date(),
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  ok(res);
});
app.get("/api/admin/overview", async (_req, res) => {
  await expireReservations();
  const d = await db();
  const [streets, zones, spots, reservations, users] = await Promise.all(
    ["streets", "zones", "spots", "reservations", "users"].map((c) =>
      d
        .collection(c)
        .find(
          {},
          {
            projection:
              c === "users" ? { passwordHash: 0, _id: 0 } : { _id: 0 },
          },
        )
        .sort(c === "reservations" ? { createdAt: -1 } : { name: 1 })
        .limit(1000)
        .toArray(),
    ),
  );
  ok(res, {
    streets,
    zones,
    spots,
    reservations,
    users: users.map(publicUser),
  });
});
const streetSchema = z.object({
  name: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100),
  image: z
    .string()
    .max(500)
    .refine(
      (v) => v === "" || v.startsWith("/images/") || /^https:\/\//.test(v),
      "Use an HTTPS or local image URL",
    )
    .optional(),
  enabled: z.boolean().optional(),
});
const zoneSchema = z.object({
  streetId: idSchema,
  name: z.string().trim().min(1).max(100),
  distance: z.number().int().min(0).max(100000),
  hourlyRate: z
    .number()
    .min(0)
    .max(10000)
    .refine(
      (n) => Number.isInteger(Math.round(n * 1000000) / 10000),
      "Use at most 2 decimal places",
    ),
  enabled: z.boolean().optional(),
});
const spotSchema = z.object({
  zoneId: idSchema,
  name: z.string().trim().min(1).max(100),
  distance: z.number().int().min(0).max(100000),
  occupied: z.boolean().optional(),
  enabled: z.boolean().optional(),
});
for (const [collection, schema] of [
  ["streets", streetSchema],
  ["zones", zoneSchema],
  ["spots", spotSchema],
] as const) {
  app.post(`/api/admin/${collection}`, async (req, res) => {
    const input = schema.parse(req.body),
      d = await db();
    if (
      "streetId" in input &&
      !(await d.collection("streets").findOne({ id: input.streetId }))
    )
      fail(400, "Street not found");
    if (
      "zoneId" in input &&
      !(await d.collection("zones").findOne({ id: input.zoneId }))
    )
      fail(400, "Zone not found");
    const item = {
      id: randomUUID(),
      enabled: true,
      ...(collection === "streets" ? { image: "" } : {}),
      ...(collection === "spots"
        ? { occupied: false, reservationId: null }
        : {}),
      ...input,
    };
    await d.collection(collection).insertOne(item);
    res.status(201);
    ok(res, { item: strip(item) });
  });
  app.patch(`/api/admin/${collection}/:id`, async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const input = schema.partial().strict().parse(req.body);
    const d = await db();
    // Relationships remain stable once created; this preserves reservation history.
    if ("zoneId" in input || "streetId" in input)
      fail(400, "Create a new item to change its parent");
    const filter: any = { id };
    // Reserved spaces can record physical occupancy, but cannot be archived mid-booking.
    if (collection === "spots" && input.enabled === false)
      filter.reservationId = null;
    const item = await d
      .collection(collection)
      .findOneAndUpdate(filter, { $set: input }, { returnDocument: "after" });
    if (!item) fail(409, "Item not found or has an active reservation");
    ok(res, { item: strip(item) });
  });
}
async function expireReservations() {
  const d = await db();
  const expired = await d
    .collection("reservations")
    .find(
      { status: "active", expiresAt: { $lte: new Date() } },
      { projection: { id: 1 } },
    )
    .limit(100)
    .toArray();
  for (const item of expired) {
    const session = (await client()).startSession();
    try {
      await session.withTransaction(async () => {
        const r = await d
          .collection("reservations")
          .findOneAndUpdate(
            { id: item.id, status: "active", expiresAt: { $lte: new Date() } },
            { $set: { status: "completed", endedAt: new Date() } },
            { session, returnDocument: "after" },
          );
        if (r)
          await d
            .collection("spots")
            .updateOne(
              { id: r.spotId, reservationId: r.id },
              { $set: { reservationId: null } },
              { session },
            );
      });
    } finally {
      await session.endSession();
    }
  }
}
function strip(item: any) {
  const { _id, ...rest } = item;
  return rest;
}
app.use((_req, res) =>
  res.status(404).json({ status: "failed", error: "Endpoint not found" }),
);
app.use(
  (
    error: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof z.ZodError)
      return res.status(400).json({
        status: "failed",
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    if (error.code === 11000)
      return res.status(409).json({
        status: "failed",
        error:
          "This account or item already exists, or the driver/spot already has an active reservation",
      });
    if (error instanceof HttpError)
      return res
        .status(error.status)
        .json({ status: "failed", error: error.message });
    if (error.type === "entity.parse.failed")
      return res.status(400).json({ status: "failed", error: "Invalid JSON" });
    if (error.type === "entity.too.large")
      return res
        .status(413)
        .json({ status: "failed", error: "Request too large" });
    console.error("API error", { name: error.name, code: error.code });
    res.status(503).json({
      status: "failed",
      error: "Service temporarily unavailable. Please try again",
    });
  },
);
export default app;
