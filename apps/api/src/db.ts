import { MongoClient } from "mongodb";
let clientPromise: Promise<MongoClient> | undefined;
export async function db() {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
  if (!uri) throw new Error("MongoDB is not configured");
  clientPromise ??= new MongoClient(uri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 8000,
  })
    .connect()
    .catch((error) => {
      clientPromise = undefined;
      throw error;
    });
  return (await clientPromise).db(process.env.MONGODB_DB || "smartparking");
}
export async function client() {
  await db();
  return clientPromise!;
}
export async function indexes() {
  const d = await db();
  // Additive legacy normalization; no balance, reservation, or rate is changed.
  await d
    .collection("streets")
    .updateMany(
      { countryCode: { $exists: false } },
      { $set: { countryCode: "" } },
    );
  await d
    .collection("streets")
    .createIndex({ countryCode: 1, city: 1, name: 1 }, { unique: true });
  const existing = await d.collection("streets").listIndexes().toArray();
  if (existing.some((i) => i.name === "city_1_name_1")) {
    try {
      await d.collection("streets").dropIndex("city_1_name_1");
    } catch (e: any) {
      if (e.code !== 27) throw e;
    }
  }
  await Promise.all([
    d.collection("users").createIndex({ email: 1 }, { unique: true }),
    d.collection("invitations").createIndex({ email: 1 }, { unique: true }),
    d.collection("ledger").createIndex({ userId: 1, createdAt: -1 }),
    d.collection("reservations").createIndex({ status: 1, expiresAt: 1 }),
    d.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true }),
    d
      .collection("sessions")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    d
      .collection("authAttempts")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    d
      .collection("reservations")
      .createIndex(
        { spotId: 1 },
        { unique: true, partialFilterExpression: { status: "active" } },
      ),
    d
      .collection("reservations")
      .createIndex(
        { userId: 1 },
        { unique: true, partialFilterExpression: { status: "active" } },
      ),
    d.collection("spots").createIndex({ zoneId: 1, name: 1 }, { unique: true }),
    d
      .collection("zones")
      .createIndex({ streetId: 1, name: 1 }, { unique: true }),
  ]);
}
export async function closeDb() {
  if (clientPromise) await (await clientPromise).close();
  clientPromise = undefined;
}
