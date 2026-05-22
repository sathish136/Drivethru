/**
 * ZK Push ADMS Server — port 8081
 *
 * Native implementation of the ZKTeco ADMS push protocol.
 * Devices connect automatically; no manual registration needed.
 *
 * Endpoints (all on port 8081):
 *   GET  /iclock/cdata?SN=XXX&options=all   — initialization handshake
 *   GET  /iclock/getrequest?SN=XXX          — keep-alive polling (every ~30 s)
 *   POST /iclock/cdata?SN=XXX&table=ATTLOG  — attendance data upload
 *   POST /iclock/cdata?SN=XXX&table=OPERLOG — user data (ignored, OK returned)
 */

import express from "express";
import http from "node:http";
import { db } from "@workspace/db";
import { biometricDevices, branches } from "@workspace/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { processAttRows } from "./routes/biometric.js";
import { setZkAdmsRunning } from "./lib/adms-state.js";

const admsApp = express();

// Accept plain-text body for ATTLOG uploads
admsApp.use(express.text({ type: "*/*", limit: "50mb" }));

// ── In-memory throttle: avoid spamming DB on every keep-alive ────────────────
const deviceLastTouched = new Map<string, number>();
let cachedDefaultBranchId: number | null = null;

async function getDefaultBranchId(): Promise<number> {
  if (cachedDefaultBranchId !== null) return cachedDefaultBranchId;
  const [first] = await db.select({ id: branches.id }).from(branches).limit(1);
  cachedDefaultBranchId = first?.id ?? 1;
  return cachedDefaultBranchId;
}

/**
 * Upsert device in biometric_devices.
 * Throttled to at most once per 30 s per device to avoid excessive DB writes.
 */
export async function touchDevice(sn: string, ip: string): Promise<void> {
  const now = Date.now();
  const last = deviceLastTouched.get(sn) ?? 0;
  if (now - last < 30_000) return;
  deviceLastTouched.set(sn, now);

  try {
    const branchId = await getDefaultBranchId();
    await db
      .insert(biometricDevices)
      .values({
        name: `ZK Device (${sn})`,
        serialNumber: sn,
        model: "ZKTeco",
        ipAddress: ip,
        port: 8081,
        branchId,
        pushMethod: "zkpush",
        status: "online",
        lastSync: new Date(),
      })
      .onConflictDoUpdate({
        target: biometricDevices.serialNumber,
        set: { ipAddress: ip, status: "online", lastSync: new Date() },
      });
  } catch (e) {
    console.error("[ZK ADMS] touchDevice error:", e);
  }
}

/** Parse ATTLOG body into AttRow array. */
function parseAttLog(body: string, sn: string) {
  const rows: { pin: string; time: string; status: string; sn: string }[] = [];
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const cols = line.split(/\s+/);
    if (cols.length < 3) continue;

    const pin = cols[0];
    let timeStr: string;
    let statusIdx: number;

    // ZK devices send date and time as separate columns: "PIN YYYY-MM-DD HH:MM:SS STATUS ..."
    if (
      cols.length >= 4 &&
      /^\d{4}-\d{2}-\d{2}$/.test(cols[1]) &&
      /^\d{2}:\d{2}:\d{2}$/.test(cols[2])
    ) {
      timeStr = `${cols[1]} ${cols[2]}`;
      statusIdx = 3;
    } else {
      // Fallback: combined datetime in second column
      timeStr = cols[1] ?? "";
      statusIdx = 2;
    }

    if (!timeStr || !/^\d{4}-\d{2}-\d{2}/.test(timeStr)) continue;

    rows.push({ pin, time: timeStr, status: cols[statusIdx] ?? "0", sn });
  }
  return rows;
}

/** Extract the real client IP (handles reverse proxies). */
function clientIp(req: express.Request): string {
  return String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "")
    .split(",")[0]
    .trim();
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /iclock/cdata?SN=XXX&options=all
 * Device initialization — respond with push configuration.
 */
admsApp.get(["/iclock/cdata", "/iclock/cdata.aspx"], async (req, res) => {
  const sn = String(req.query["SN"] ?? req.query["sn"] ?? "").trim();
  if (!sn) { res.status(400).type("text/plain").send("Missing SN"); return; }

  const ip = clientIp(req);
  await touchDevice(sn, ip);

  if (String(req.query["options"] ?? "") === "all") {
    // Full initialization handshake — ATTLOGStamp=0 forces device to upload ALL records
    const body = [
      `GET OPTION FROM: ${sn}`,
      "ATTLOGStamp=0",
      "OPERLOGStamp=0",
      "BIODATAStamp=0",
      "ATTPHOTOStamp=0",
      "USERStamp=0",
      "ErrorDelay=30",
      "Delay=3",
      "TransTimes=",
      "TransInterval=1",
      "TransFlag=TransData AttLog\tOpLog\tEnrollUser\tChgUser",
      "TimeZone=330",
      "Realtime=0",
      "Encrypt=None",
      "ServerVer=2.2.14",
      "PushProtVer=2.2.14",
    ].join("\r\n");

    console.log(`[ZK ADMS] INIT  SN=${sn} IP=${ip}`);
    res.type("text/plain").send(body);
    return;
  }

  res.type("text/plain").send("OK");
});

/**
 * POST /iclock/cdata?SN=XXX&table=ATTLOG
 * Device uploads attendance punch records.
 */
admsApp.post(["/iclock/cdata", "/iclock/cdata.aspx"], async (req, res) => {
  const sn = String(req.query["SN"] ?? req.query["sn"] ?? "").trim();
  if (!sn) { res.status(400).type("text/plain").send("Missing SN"); return; }

  const ip = clientIp(req);
  await touchDevice(sn, ip);

  const table = String(req.query["table"] ?? "").toUpperCase();
  const body = typeof req.body === "string" ? req.body : "";

  if (table === "ATTLOG" && body.trim()) {
    const rows = parseAttLog(body, sn);
    if (rows.length > 0) {
      console.log(`[ZK ADMS] ATTLOG SN=${sn}: ${rows.length} record(s)`);
      processAttRows(rows)
        .then(stats => {
          console.log(`[ZK ADMS] Processed SN=${sn}: created=${stats.created} updated=${stats.updated} unmatched=${stats.unmatched}`);
        })
        .catch(e => console.error(`[ZK ADMS] processAttRows error SN=${sn}:`, e));
    }
  }

  // Always respond OK immediately so device doesn't time out
  res.type("text/plain").send("OK: 0");
});

/**
 * GET /iclock/getrequest?SN=XXX
 * Keep-alive polling — device calls this every ~30 s.
 */
admsApp.get(["/iclock/getrequest", "/iclock/getrequest.aspx"], async (req, res) => {
  const sn = String(req.query["SN"] ?? req.query["sn"] ?? "").trim();
  if (sn) await touchDevice(sn, clientIp(req));
  res.type("text/plain").send("OK");
});

// Catch-all middleware: return OK for any other ZK ADMS path
admsApp.use("/iclock", (_req, res) => res.type("text/plain").send("OK"));

// ── Background: sweep offline devices ────────────────────────────────────────

async function sweepOfflineDevices(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 3 * 60 * 1000); // 3 minutes
    await db
      .update(biometricDevices)
      .set({ status: "offline" })
      .where(
        and(
          eq(biometricDevices.status, "online"),
          lt(biometricDevices.lastSync, cutoff)
        )
      );
  } catch (e) {
    console.error("[ZK ADMS] sweepOfflineDevices error:", e);
  }
}

// ── Export ────────────────────────────────────────────────────────────────────

export function startZkAdmsServer(port = 8081): http.Server {
  const server = http.createServer(admsApp);

  server.on("error", (err: NodeJS.ErrnoException) => {
    setZkAdmsRunning(false);
    if (err.code === "EADDRINUSE") {
      console.warn(`[ZK ADMS] Port ${port} already in use — ADMS server not started. Stop the existing service (e.g. bio_sync.py) and restart to enable auto-discovery.`);
    } else {
      console.error("[ZK ADMS] Server error:", err.message);
    }
  });

  server.listen(port, "0.0.0.0", () => {
    setZkAdmsRunning(true);
    console.log(`ZK Push ADMS server listening on port ${port}`);
    // Start offline sweep only after successful bind
    setInterval(sweepOfflineDevices, 2 * 60 * 1000);
  });

  return server;
}
