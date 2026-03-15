import { Router } from "express";
import { db } from "@workspace/db";
import { systemUsers } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, generateToken, createSession, deleteSession, authMiddleware } from "../lib/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ message: "Username and password required", success: false });
      return;
    }
    const [user] = await db.select().from(systemUsers).where(eq(systemUsers.username, username));
    if (!user || !user.isActive) {
      res.status(401).json({ message: "Invalid credentials", success: false });
      return;
    }
    const hash = hashPassword(password);
    if (user.passwordHash !== hash) {
      res.status(401).json({ message: "Invalid credentials", success: false });
      return;
    }
    const token = generateToken(user.id);
    createSession(token, user.id);
    await db.update(systemUsers).set({ lastLogin: new Date() }).where(eq(systemUsers.id, user.id));
    const branchIds: number[] = JSON.parse(user.branchIds || "[]");
    res.cookie("auth_token", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: "lax" });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        branchIds,
        branchNames: [],
        isActive: user.isActive,
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error", success: false });
  }
});

router.post("/logout", (req, res) => {
  const token = req.cookies?.["auth_token"] || req.headers.authorization?.replace("Bearer ", "");
  if (token) deleteSession(token);
  res.clearCookie("auth_token");
  res.json({ message: "Logged out", success: true });
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const [user] = await db.select().from(systemUsers).where(eq(systemUsers.id, userId));
    if (!user) { res.status(404).json({ message: "Not found", success: false }); return; }
    const branchIds: number[] = JSON.parse(user.branchIds || "[]");
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      branchIds,
      branchNames: [],
      isActive: user.isActive,
    });
  } catch (e) {
    res.status(500).json({ message: "Server error", success: false });
  }
});

export default router;
