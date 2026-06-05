import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import { readFileSync } from "fs";
import { resolve } from "path";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.post("/schema-sync-temp", async (_req, res) => {
  const sqlPath = resolve("/home/runner/workspace/lib/db/drizzle/0000_schema_sync.sql");
  const raw = readFileSync(sqlPath, "utf-8");
  const statements = raw.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

  const run = async (stmt: string) => {
    let sql = stmt;
    if (sql.startsWith("CREATE TABLE")) {
      sql = sql.replace(/^CREATE TABLE\s+"/, 'CREATE TABLE IF NOT EXISTS "');
    }
    try {
      await pool.query(sql);
      return { stmt: sql.slice(0, 60), status: "ok" };
    } catch (e: any) {
      if (["42P07","42710","42P16","23505"].includes(e.code)) {
        return { stmt: sql.slice(0, 60), status: "skipped" };
      }
      return { stmt: sql.slice(0, 60), status: "error", error: e.message };
    }
  };

  // Run CREATE TABLE statements in parallel, then ALTER TABLE in parallel
  const creates = statements.filter(s => s.startsWith("CREATE TABLE") || s.startsWith("CREATE SEQUENCE") || s.startsWith("CREATE INDEX"));
  const alters  = statements.filter(s => s.startsWith("ALTER TABLE") || s.startsWith("ALTER SEQUENCE"));

  const createResults = await Promise.all(creates.map(run));
  const alterResults  = await Promise.all(alters.map(run));
  const results = [...createResults, ...alterResults];

  const errors = results.filter(r => r.status === "error");
  res.json({ total: results.length, errors: errors.length, results });
});

export default router;
