import { Router } from "express";
import { db } from "@workspace/db";
import { employees, branches, shifts } from "@workspace/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";

const router = Router();

async function mapEmployee(e: any) {
  return {
    ...e,
    joiningDate: e.joiningDate,
    branchName: "",
    shiftName: null,
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const { branchId, status, search, page = "1", limit = "20" } = req.query;
    const all = await db.select({
      emp: employees,
      branchName: branches.name,
      shiftName: shifts.name,
    })
      .from(employees)
      .leftJoin(branches, eq(employees.branchId, branches.id))
      .leftJoin(shifts, eq(employees.shiftId, shifts.id));

    let filtered = all;
    if (branchId) filtered = filtered.filter(r => r.emp.branchId === Number(branchId));
    if (status) filtered = filtered.filter(r => r.emp.status === status);
    if (search) {
      const s = (search as string).toLowerCase();
      filtered = filtered.filter(r =>
        r.emp.fullName.toLowerCase().includes(s) ||
        r.emp.employeeId.toLowerCase().includes(s) ||
        r.emp.designation.toLowerCase().includes(s)
      );
    }

    const total = filtered.length;
    const p = Number(page);
    const l = Number(limit);
    const paginated = filtered.slice((p - 1) * l, p * l);

    res.json({
      employees: paginated.map(r => ({
        ...r.emp,
        branchName: r.branchName || "",
        shiftName: r.shiftName || null,
        createdAt: r.emp.createdAt.toISOString(),
      })),
      total,
      page: p,
      limit: l,
    });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

router.post("/", async (req, res) => {
  try {
    const [emp] = await db.insert(employees).values(req.body).returning();
    const [branch] = await db.select().from(branches).where(eq(branches.id, emp.branchId));
    res.status(201).json({ ...emp, branchName: branch?.name || "", shiftName: null, createdAt: emp.createdAt.toISOString() });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

router.get("/:id", async (req, res) => {
  try {
    const [row] = await db.select({
      emp: employees,
      branchName: branches.name,
      shiftName: shifts.name,
    }).from(employees)
      .leftJoin(branches, eq(employees.branchId, branches.id))
      .leftJoin(shifts, eq(employees.shiftId, shifts.id))
      .where(eq(employees.id, Number(req.params.id)));
    if (!row) { res.status(404).json({ message: "Not found", success: false }); return; }
    res.json({ ...row.emp, branchName: row.branchName || "", shiftName: row.shiftName || null, createdAt: row.emp.createdAt.toISOString() });
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

router.put("/:id", async (req, res) => {
  try {
    const [emp] = await db.update(employees).set(req.body).where(eq(employees.id, Number(req.params.id))).returning();
    const [branch] = await db.select().from(branches).where(eq(branches.id, emp.branchId));
    res.json({ ...emp, branchName: branch?.name || "", shiftName: null, createdAt: emp.createdAt.toISOString() });
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(employees).where(eq(employees.id, Number(req.params.id)));
    res.json({ message: "Deleted", success: true });
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

export default router;
