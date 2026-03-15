import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "salt_po_2024").digest("hex");
}

export function generateToken(userId: number): string {
  return crypto.createHash("sha256").update(`${userId}-${Date.now()}-po_secret`).digest("hex");
}

const activeSessions = new Map<string, { userId: number; expiresAt: number }>();

export function createSession(token: string, userId: number) {
  activeSessions.set(token, { userId, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
}

export function getSession(token: string): { userId: number } | null {
  const session = activeSessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    activeSessions.delete(token);
    return null;
  }
  return { userId: session.userId };
}

export function deleteSession(token: string) {
  activeSessions.delete(token);
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.["auth_token"] || req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ message: "Unauthorized", success: false });
    return;
  }
  const session = getSession(token);
  if (!session) {
    res.status(401).json({ message: "Session expired", success: false });
    return;
  }
  (req as any).userId = session.userId;
  next();
}
