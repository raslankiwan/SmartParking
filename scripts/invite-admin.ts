import { randomBytes } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { db, closeDb } from "../apps/api/src/db.js";
import { hashToken } from "../apps/api/src/auth.js";
const [email, origin, file] = process.argv.slice(2);
if (!email || !origin || !file)
  throw new Error("Usage: invite-admin email origin output-file");
const d = await db();
if (await d.collection("users").findOne({ email }))
  throw new Error("Account exists; use admin:promote instead");
const token = randomBytes(32).toString("base64url");
await d
  .collection("invitations")
  .updateOne(
    { email },
    {
      $set: {
        email,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 48 * 3600000),
      },
    },
    { upsert: true },
  );
await writeFile(
  file,
  `# SmartParking administrator setup\n\nOpen this private, one-time link within 48 hours, then choose your password:\n\n${origin}/#setup=${token}&email=${encodeURIComponent(email)}\n\nKeep this link private. It grants administrator access only to ${email}.\n`,
  { mode: 0o600 },
);
console.log("One-time setup link saved privately to the requested file.");
await closeDb();
