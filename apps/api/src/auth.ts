import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db.js";
import type { User } from "@smartparking/contracts";
const derive = promisify(scrypt);
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${((await derive(password, salt, 64)) as Buffer).toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  const expected = Buffer.from(key, "hex");
  const actual = (await derive(password, salt, 64)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionHash?: string;
    }
  }
}
export function publicUser(user: any): User {
  const {
    id,
    email,
    firstName,
    lastName,
    phone,
    role,
    createdAt,
    balanceCents = 0,
  } = user;
  return {
    id,
    email,
    firstName,
    lastName,
    phone,
    role,
    createdAt,
    balanceCents,
  };
}
export async function createSession(userId: string, res: Response) {
  const token = randomBytes(32).toString("base64url");
  await (await db())
    .collection("sessions")
    .insertOne({
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });
  res.cookie("sp_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 86400000,
    path: "/",
  });
  return token;
}
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.headers.authorization;
  const token = authorization
    ? authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined
    : req.cookies.sp_session;
  if (!token)
    return res.status(401).json({ status: "failed", error: "Please sign in" });
  const d = await db();
  const tokenHash = hashToken(token);
  const session = await d
    .collection("sessions")
    .findOne({ tokenHash, expiresAt: { $gt: new Date() } });
  const user =
    session && (await d.collection("users").findOne({ id: session.userId }));
  if (!user)
    return res
      .status(401)
      .json({
        status: "failed",
        error: "Session expired. Please sign in again",
      });
  req.user = publicUser(user);
  req.sessionHash = tokenHash;
  next();
}
export function admin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin")
    return res
      .status(403)
      .json({ status: "failed", error: "Administrator access required" });
  next();
}
