import { db, closeDb } from "../apps/api/src/db.js";
const email = process.argv[2]?.toLowerCase();
if (!email)
  throw new Error("Usage: npm run admin:promote -- email@example.com");
const result = await (await db())
  .collection("users")
  .updateOne({ email }, { $set: { role: "admin" } });
if (!result.matchedCount) throw new Error("Register this account first");
console.log("Administrator role granted.");
await closeDb();
