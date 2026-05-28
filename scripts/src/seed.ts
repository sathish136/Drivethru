import { db } from "@workspace/db";
import {
  systemUsers,
  systemSettings,
} from "@workspace/db/schema";
import crypto from "crypto";
import { eq } from "drizzle-orm";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "salt_po_2024").digest("hex");
}

async function seed() {
  console.log("Initialising database...");

  // System settings — insert only if no row exists yet
  const existingSettings = await db.select().from(systemSettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(systemSettings).values({
      organizationName: "Sri Lanka Post",
      organizationCode: "SLP",
      workingDays: JSON.stringify(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]),
      timezone: "Asia/Colombo",
      lateThresholdMinutes: 15,
      halfDayThresholdHours: 4,
      overtimeThresholdHours: 8,
      autoMarkAbsent: false,
      biometricSyncInterval: 5,
      zkPushServerUrl: "",
      zkPushApiKey: null,
    });
    console.log("  ✅ Default system settings created");
  } else {
    console.log("  ⏭  System settings already exist — skipped");
  }

  // Admin user — insert only if username 'admin' does not exist
  const existingAdmin = await db.select().from(systemUsers).where(eq(systemUsers.username, "admin")).limit(1);
  if (existingAdmin.length === 0) {
    await db.insert(systemUsers).values({
      username: "admin",
      fullName: "Super Administrator",
      email: "admin@slpost.lk",
      passwordHash: hashPassword("admin123"),
      role: "super_admin",
      branchIds: JSON.stringify([]),
      isActive: true,
    });
    console.log("  ✅ Admin user created (username: admin / password: admin123)");
  } else {
    console.log("  ⏭  Admin user already exists — skipped");
  }

  console.log("✅ Initialisation complete.");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
