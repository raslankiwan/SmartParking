import { randomUUID } from "node:crypto";
import { db, indexes, closeDb } from "../apps/api/src/db.js";
await indexes();
const d = await db();
if (!process.argv.includes("--demo")) {
  console.log(
    "Database indexes ready. No location or sample inventory was created. Add streets in the admin portal, or run npm run db:demo explicitly.",
  );
  await closeDb();
  process.exit(0);
}
let street = await d
  .collection("streets")
  .findOne({ seedKey: "original-jaffa" });
if (!street) {
  await d.collection("streets").insertOne({
    id: randomUUID(),
    name: "Jaffa Street",
    seedKey: "original-jaffa",
    city: "Unspecified",
    countryCode: "",
    currency: "ILS",
    timeZone: "UTC",
    image: "/images/jaffa.jpg",
    enabled: true,
  });
  street = await d.collection("streets").findOne({ seedKey: "original-jaffa" });
}
for (const [i, distance] of [0, 280, 440, 680, 900, 1050].entries()) {
  const name = `Zone ${i + 1}`;
  await d.collection("zones").updateOne(
    { seedKey: `original-jaffa-zone-${i + 1}` },
    {
      $setOnInsert: {
        id: randomUUID(),
        streetId: street!.id,
        seedKey: `original-jaffa-zone-${i + 1}`,
        name,
        distance,
        hourlyRate: 2,
        enabled: true,
        legacyId: i + 1,
      },
    },
    { upsert: true },
  );
  const zone = await d
    .collection("zones")
    .findOne({ seedKey: `original-jaffa-zone-${i + 1}` });
  for (let j = 1; j <= 8; j++)
    await d.collection("spots").updateOne(
      { seedKey: `original-jaffa-spot-${i + 1}-${j}` },
      {
        $setOnInsert: {
          id: randomUUID(),
          zoneId: zone!.id,
          seedKey: `original-jaffa-spot-${i + 1}-${j}`,
          name: `J${i + 1}-${String(j).padStart(2, "0")}`,
          distance: distance + (j - 1) * 5,
          occupied: false,
          enabled: true,
          reservationId: null,
        },
      },
      { upsert: true },
    );
}
console.log(
  "Seed complete: Jaffa Street, 6 zones, 48 sample spots. Existing records were preserved.",
);
await closeDb();
