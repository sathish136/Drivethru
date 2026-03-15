import { db } from "@workspace/db";
import {
  branches, employees, shifts, attendanceRecords,
  systemUsers, systemSettings, holidays
} from "@workspace/db/schema";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "salt_po_2024").digest("hex");
}

function calcWorkHours(t1: string, t2: string): number {
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  return Math.max(0, (h2 * 60 + m2 - (h1 * 60 + m1)) / 60);
}

async function seed() {
  console.log("Seeding database...");

  // Clear existing
  await db.delete(attendanceRecords);
  await db.delete(employees);
  await db.delete(shifts);
  await db.delete(systemUsers);
  await db.delete(holidays);
  await db.delete(branches);
  await db.delete(systemSettings);

  // Settings
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
    zkPushServerUrl: "http://0.0.0.0:8765",
    zkPushApiKey: null,
  });

  // Holidays
  await db.insert(holidays).values([
    { name: "New Year", date: "2026-01-01", type: "national" },
    { name: "Independence Day", date: "2026-02-04", type: "national" },
    { name: "Poya Day", date: "2026-03-03", type: "religious" },
    { name: "Sinhala & Tamil New Year", date: "2026-04-13", type: "national" },
    { name: "May Day", date: "2026-05-01", type: "national" },
  ]);

  // Branches - Head Office
  const [ho] = await db.insert(branches).values({
    name: "Head Office - Colombo",
    code: "HO-001",
    type: "head_office",
    address: "310, D.R. Wijewardana Mawatha, Colombo 10",
    phone: "+94-11-2696200",
    managerName: "Mr. Pradeep Fernando",
    isActive: true,
  }).returning();

  // Regional Offices
  const regionalData = [
    { name: "Western Regional Office", code: "RO-001", address: "Colombo", phone: "+94-11-2230000", manager: "Ms. Chamari Silva" },
    { name: "Central Regional Office", code: "RO-002", address: "Kandy", phone: "+94-81-2223000", manager: "Mr. Nimal Perera" },
    { name: "Southern Regional Office", code: "RO-003", address: "Galle", phone: "+94-91-2222000", manager: "Ms. Dilrukshi Jayawardena" },
    { name: "Northern Regional Office", code: "RO-004", address: "Jaffna", phone: "+94-21-2222000", manager: "Mr. Krishnan Rajan" },
    { name: "Eastern Regional Office", code: "RO-005", address: "Trincomalee", phone: "+94-26-2222000", manager: "Mr. Mohamed Rashid" },
    { name: "North Western Regional", code: "RO-006", address: "Kurunegala", phone: "+94-37-2222000", manager: "Ms. Sandya Rathnayake" },
    { name: "North Central Regional", code: "RO-007", address: "Anuradhapura", phone: "+94-25-2222000", manager: "Mr. Gamini Herath" },
    { name: "Uva Regional Office", code: "RO-008", address: "Badulla", phone: "+94-55-2222000", manager: "Ms. Priyanka Bandara" },
    { name: "Sabaragamuwa Regional", code: "RO-009", address: "Ratnapura", phone: "+94-45-2222000", manager: "Mr. Surendra Wickrama" },
    { name: "Wayamba Regional Office", code: "RO-010", address: "Puttalam", phone: "+94-32-2222000", manager: "Ms. Tharanga Gunawardena" },
    { name: "Dambulla Regional Office", code: "RO-011", address: "Dambulla", phone: "+94-66-2222000", manager: "Mr. Asela Kumara" },
    { name: "Matara Regional Office", code: "RO-012", address: "Matara", phone: "+94-41-2222000", manager: "Ms. Nilushi Fernando" },
    { name: "Negombo Regional Office", code: "RO-013", address: "Negombo", phone: "+94-31-2222000", manager: "Mr. Roshan Wijesinghe" },
    { name: "Kegalle Regional Office", code: "RO-014", address: "Kegalle", phone: "+94-35-2222000", manager: "Ms. Waruni Abeysekara" },
  ];

  const regionalBranches = await db.insert(branches).values(
    regionalData.map(r => ({ name: r.name, code: r.code, type: "regional" as const, parentId: ho.id, address: r.address, phone: r.phone, managerName: r.manager, isActive: true }))
  ).returning();

  // Sub-branches for first 3 regional offices
  const subBranchData = [
    { name: "Colombo 1 Post Office", code: "SB-001", parentId: regionalBranches[0].id, address: "Colombo 01", manager: "Mr. Ajith" },
    { name: "Colombo 3 Post Office", code: "SB-002", parentId: regionalBranches[0].id, address: "Colombo 03", manager: "Ms. Nadeeka" },
    { name: "Colombo 7 Post Office", code: "SB-003", parentId: regionalBranches[0].id, address: "Colombo 07", manager: "Mr. Suresh" },
    { name: "Nugegoda Post Office", code: "SB-004", parentId: regionalBranches[0].id, address: "Nugegoda", manager: "Ms. Iroshini" },
    { name: "Kandy Main Post Office", code: "SB-005", parentId: regionalBranches[1].id, address: "Kandy", manager: "Mr. Sampath" },
    { name: "Peradeniya Post Office", code: "SB-006", parentId: regionalBranches[1].id, address: "Peradeniya", manager: "Ms. Kumari" },
    { name: "Gampola Post Office", code: "SB-007", parentId: regionalBranches[1].id, address: "Gampola", manager: "Mr. Ranjith" },
    { name: "Galle Main Post Office", code: "SB-008", parentId: regionalBranches[2].id, address: "Galle", manager: "Ms. Chamindi" },
    { name: "Matara Post Office", code: "SB-009", parentId: regionalBranches[2].id, address: "Matara", manager: "Mr. Prasad" },
  ];

  const subBranches = await db.insert(branches).values(
    subBranchData.map(s => ({ name: s.name, code: s.code, type: "sub_branch" as const, parentId: s.parentId, address: s.address, managerName: s.manager, isActive: true }))
  ).returning();

  // Shifts
  const [shift1, shift2, shift3] = await db.insert(shifts).values([
    { name: "Morning Shift", type: "normal", startTime1: "08:00", endTime1: "16:30", graceMinutes: 15, overtimeThreshold: 60, isActive: true },
    { name: "Day Shift", type: "normal", startTime1: "09:00", endTime1: "17:30", graceMinutes: 15, overtimeThreshold: 60, isActive: true },
    { name: "Split Shift A", type: "split", startTime1: "08:00", endTime1: "12:00", startTime2: "13:00", endTime2: "17:00", graceMinutes: 10, overtimeThreshold: 60, isActive: true },
    { name: "Counter Shift", type: "normal", startTime1: "07:30", endTime1: "15:30", graceMinutes: 10, overtimeThreshold: 60, isActive: true },
  ]).returning();

  // Employees
  const empData = [];
  const firstNames = ["Priya", "Nuwan", "Kasun", "Dilshan", "Tharindu", "Chamara", "Sachith", "Ruwani", "Malsha", "Lasith", "Amaya", "Dineth", "Hiruni", "Supun", "Nadeesha", "Chathura", "Sewwandi", "Asitha", "Thilanka", "Kanchana"];
  const lastNames = ["Fernando", "Silva", "Perera", "Jayawardena", "Bandara", "Wijesinghe", "Herath", "Gunawardena", "Rathnayake", "Wickramasinghe", "Kumara", "Dissanayake", "Senanayake", "Karunaratne", "Amarasinghe"];
  const designations = ["Postmaster", "Assistant Postmaster", "Postal Officer", "Counter Clerk", "Delivery Agent", "Sorting Officer", "Data Entry Operator", "Driver", "Security Officer", "Supervisor"];
  const departments = ["Operations", "Counter Services", "Delivery", "Finance", "Administration", "IT", "Security"];

  const allBranches = [ho, ...regionalBranches, ...subBranches];
  let empCount = 1;
  for (const branch of allBranches.slice(0, 15)) {
    const count = branch.type === "head_office" ? 12 : branch.type === "regional" ? 8 : 5;
    for (let i = 0; i < count; i++) {
      const fn = firstNames[(empCount + i) % firstNames.length];
      const ln = lastNames[(empCount + i * 2) % lastNames.length];
      empData.push({
        employeeId: `EMP-${String(empCount + i).padStart(4, "0")}`,
        fullName: `${fn} ${ln}`,
        designation: designations[(empCount + i) % designations.length],
        department: departments[(empCount + i) % departments.length],
        branchId: branch.id,
        shiftId: [shift1.id, shift2.id, shift3.id][(empCount + i) % 3],
        joiningDate: `${2020 + ((empCount + i) % 5)}-${String(((empCount + i) % 12) + 1).padStart(2, "0")}-15`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}${empCount + i}@slpost.lk`,
        phone: `+94-7${(1 + (empCount + i) % 7)}-${String(1000000 + (empCount * 1000 + i)).slice(0, 7)}`,
        biometricId: `BIO-${String(empCount + i).padStart(4, "0")}`,
        status: "active" as const,
      });
    }
    empCount += count;
  }

  const createdEmployees = await db.insert(employees).values(empData).returning();

  // Attendance for last 30 days
  const today = new Date();
  const statuses: ("present" | "absent" | "late" | "half_day" | "leave")[] = ["present", "present", "present", "present", "present", "present", "present", "late", "absent", "half_day", "leave"];
  const attendanceBatch = [];

  for (let d = 29; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) continue; // Skip Sunday

    const dateStr = date.toISOString().split("T")[0];
    for (const emp of createdEmployees.slice(0, 80)) {
      const st = statuses[Math.floor(Math.random() * statuses.length)];
      const inHour = st === "late" ? 8 + Math.floor(Math.random() * 2) : 8;
      const inMin = st === "late" ? 20 + Math.floor(Math.random() * 40) : Math.floor(Math.random() * 10);
      const inTime1 = (st === "present" || st === "late") ? `${String(inHour).padStart(2, "0")}:${String(inMin).padStart(2, "0")}` : null;
      const outTime1 = (st === "present" || st === "late") ? `16:${String(30 + Math.floor(Math.random() * 60)).padStart(2, "0")}` : null;
      const outHour = 16;
      const outMin = 30 + Math.floor(Math.random() * 60);
      const actualOutTime = outMin >= 60 ? `17:${String(outMin - 60).padStart(2, "0")}` : `16:${String(outMin).padStart(2, "0")}`;
      const wh1 = inTime1 ? calcWorkHours(inTime1, actualOutTime) : null;
      const ot = wh1 && wh1 > 8 ? wh1 - 8 : 0;
      attendanceBatch.push({
        employeeId: emp.id,
        branchId: emp.branchId,
        date: dateStr,
        status: st,
        inTime1,
        outTime1: inTime1 ? actualOutTime : null,
        workHours1: wh1,
        totalHours: wh1,
        overtimeHours: ot > 0 ? ot : null,
        source: "biometric" as const,
      });
    }
  }

  // Insert in batches
  const batchSize = 200;
  for (let i = 0; i < attendanceBatch.length; i += batchSize) {
    await db.insert(attendanceRecords).values(attendanceBatch.slice(i, i + batchSize));
  }

  // System users
  await db.insert(systemUsers).values([
    {
      username: "admin",
      fullName: "Super Administrator",
      email: "admin@slpost.lk",
      passwordHash: hashPassword("admin123"),
      role: "super_admin",
      branchIds: JSON.stringify([]),
      isActive: true,
    },
    {
      username: "western",
      fullName: "Western Regional Admin",
      email: "western@slpost.lk",
      passwordHash: hashPassword("western123"),
      role: "regional_admin",
      branchIds: JSON.stringify([regionalBranches[0].id, subBranches[0].id, subBranches[1].id, subBranches[2].id, subBranches[3].id]),
      isActive: true,
    },
    {
      username: "viewer",
      fullName: "Report Viewer",
      email: "viewer@slpost.lk",
      passwordHash: hashPassword("viewer123"),
      role: "viewer",
      branchIds: JSON.stringify([ho.id]),
      isActive: true,
    },
  ]);

  console.log("✅ Seeding complete!");
  console.log(`  ${allBranches.length} branches (1 HO + 14 Regional + ${subBranches.length} Sub)`);
  console.log(`  ${createdEmployees.length} employees`);
  console.log(`  ${attendanceBatch.length} attendance records`);
  console.log("  Logins: admin/admin123, western/western123, viewer/viewer123");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
