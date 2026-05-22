# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
ZKTeco PUSH Server - Attendance Management System (Database Only)
Listens on port 8081 for device connections and syncs all data from machines
Stores employees, attendance records, and device info in push.db
"""

from __future__ import annotations

import os
import re
import sys
import sqlite3
import threading
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import signal

def log_info(message: str) -> None:
    """Log info message to both file and console"""
    logger.info(message)
    print(message)

def log_error(message: str) -> None:
    """Log error message to both file and console"""
    logger.error(message)
    print(message)

def log_warning(message: str) -> None:
    """Log warning message to both file and console"""
    logger.warning(message)
    print(message)

from flask import Flask, request, Response, jsonify

# Configuration
LOGS_DIRECTORY = 'logs'
APP_HOST = "0.0.0.0"
APP_PORT = 8081  # Python push server on 8081
DB_PATH = "push.db"

# Create logs directory if it doesn't exist
os.makedirs(LOGS_DIRECTORY, exist_ok=True)

# Configure logging
log_file = os.path.join(LOGS_DIRECTORY, f"erp_sync_{datetime.now().strftime('%Y%m%d')}.log")
log_format = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# File handler with rotation (10MB per file, keep 5 backups)
file_handler = RotatingFileHandler(
    log_file,
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5,
    encoding='utf-8'
)
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(log_format)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(log_format)

# Root logger configuration
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)
logger.addHandler(console_handler)

# Flask app logger
app_logger = logging.getLogger('flask')
app_logger.setLevel(logging.WARNING)  # Reduce Flask's verbose logging

app = Flask(__name__)

_http_server = None

# ============================================================================
# DATABASE HELPERS
# ============================================================================

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()

def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db() -> None:
    """Initialize database tables if they don't exist"""
    conn = db()
    cur = conn.cursor()

    # Devices table - tracks connected ZKTeco machines
    cur.execute("""
    CREATE TABLE IF NOT EXISTS devices (
        sn TEXT PRIMARY KEY,
        last_seen_utc TEXT,
        last_ip TEXT,
        pushver TEXT,
        language TEXT,
        info TEXT
    )
    """)

    # Users table - employees/users on the machine
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sn TEXT NOT NULL,
        pin TEXT NOT NULL,
        name TEXT,
        card TEXT,
        grp TEXT,
        tz TEXT,
        pri TEXT,
        verify TEXT,
        raw_line TEXT,
        updated_at_utc TEXT,
        UNIQUE(sn, pin)
    )
    """)

    # Attendance log - all attendance records
    cur.execute("""
    CREATE TABLE IF NOT EXISTS attlog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sn TEXT NOT NULL,
        pin TEXT NOT NULL,
        time TEXT,
        status TEXT,
        verify TEXT,
        workcode TEXT,
        maskflag TEXT,
        temperature TEXT,
        convtemperature TEXT,
        timeoffset TEXT,
        raw_line TEXT,
        received_at_utc TEXT
    )
    """)

    conn.commit()
    conn.close()
    log_info(f"[DB] Initialized database: {DB_PATH}")

# ============================================================================
# PARSING HELPERS
# ============================================================================

def parse_kv_line(line: str) -> Dict[str, str]:
    """Parse KEY=VALUE format (handles tabs and spaces)"""
    parts = re.split(r"[\t\r\n]+", line.strip())
    joined = " ".join(p.strip() for p in parts if p.strip())
    
    kv: Dict[str, str] = {}
    for m in re.finditer(r"(\w+)=([^=]*?)(?=\s+\w+=|$)", joined):
        k = m.group(1).strip()
        v = m.group(2).strip()
        kv[k] = v
    return kv

def parse_attlog_record(line: str) -> Optional[Dict[str, str]]:
    """Parse attendance record (PIN, Time, Status, Verify, Workcode, etc.)"""
    raw = line.strip()
    if not raw:
        return None
    
    cols = re.split(r"[\t ]+", raw)
    if len(cols) < 4:
        return None

    pin = cols[0]
    
    # Time format: "YYYY-MM-DD HH:MM:SS"
    if len(cols) >= 3 and re.match(r"\d{4}-\d{2}-\d{2}", cols[1]) and re.match(r"\d{2}:\d{2}:\d{2}", cols[2]):
        time_str = f"{cols[1]} {cols[2]}"
        idx = 3
    else:
        time_str = cols[1]
        idx = 2

    def get(i: int) -> str:
        return cols[i] if i < len(cols) else ""

    status = get(idx); idx += 1
    verify = get(idx); idx += 1
    workcode = get(idx); idx += 1

    maskflag = temperature = convtemperature = timeoffset = ""
    if len(cols) >= 4:
        tail = cols[-4:]
        if len(tail) == 4:
            maskflag, temperature, convtemperature, timeoffset = tail

    return {
        "pin": pin,
        "time": time_str,
        "status": status,
        "verify": verify,
        "workcode": workcode,
        "maskflag": maskflag,
        "temperature": temperature,
        "convtemperature": convtemperature,
        "timeoffset": timeoffset,
    }

def get_device_status() -> List[Dict[str, str]]:
    """Return list of devices with last seen, IP, and attlog count for mini GUI."""
    conn = db()
    cur = conn.cursor()
    cur.execute("""
        SELECT d.sn, d.last_seen_utc, d.last_ip, d.pushver,
               (SELECT COUNT(*) FROM attlog a WHERE a.sn = d.sn) AS attlog_count
        FROM devices d
        ORDER BY d.last_seen_utc DESC
    """)
    rows = cur.fetchall()
    conn.close()
    return [
        {
            "sn": r["sn"] or "-",
            "last_seen": (r["last_seen_utc"] or "-")[:19].replace("T", " "),
            "last_ip": r["last_ip"] or "-",
            "pushver": r["pushver"] or "-",
            "records": str(r["attlog_count"]),
        }
        for r in rows
    ]

def upsert_device(sn: str, ip: str, pushver: str = "", language: str = "", info: str = "") -> None:
    """Store or update device info"""
    conn = db()
    cur = conn.cursor()
    cur.execute("""
    INSERT INTO devices (sn, last_seen_utc, last_ip, pushver, language, info)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(sn) DO UPDATE SET
      last_seen_utc=excluded.last_seen_utc,
      last_ip=excluded.last_ip,
      pushver=excluded.pushver,
      language=excluded.language,
      info=CASE WHEN excluded.info != '' THEN excluded.info ELSE devices.info END
    """, (sn, utc_now_iso(), ip, pushver, language, info))
    conn.commit()
    conn.close()

def upsert_user(sn: str, kv: Dict[str, str], raw_line: str) -> None:
    """Store or update employee/user info"""
    pin = kv.get("PIN") or kv.get("Pin") or ""
    if not pin:
        return
    conn = db()
    cur = conn.cursor()
    cur.execute("""
    INSERT INTO users (sn, pin, name, card, grp, tz, pri, verify, raw_line, updated_at_utc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(sn, pin) DO UPDATE SET
      name=excluded.name,
      card=excluded.card,
      grp=excluded.grp,
      tz=excluded.tz,
      pri=excluded.pri,
      verify=excluded.verify,
      raw_line=excluded.raw_line,
      updated_at_utc=excluded.updated_at_utc
    """, (
        sn, pin,
        kv.get("Name", ""),
        kv.get("Card", ""),
        kv.get("Grp", ""),
        kv.get("TZ", ""),
        kv.get("Pri", ""),
        kv.get("Verify", ""),
        raw_line,
        utc_now_iso(),
    ))
    conn.commit()
    conn.close()

def insert_attlog(sn: str, rec: Dict[str, str], raw_line: str) -> None:
    """Store attendance record - prevents duplicates"""
    pin = rec.get("pin", "")
    punch_time = rec.get("time", "")
    
    # Check if this record already exists (duplicate prevention)
    conn = db()
    cur = conn.cursor()
    existing = cur.execute("""
        SELECT id FROM attlog 
        WHERE sn = ? AND pin = ? AND time = ?
        LIMIT 1
    """, (sn, pin, punch_time)).fetchone()
    
    if existing:
        # Record already exists, skip
        conn.close()
        return
    
    # New record - insert it
    cur.execute("""
    INSERT INTO attlog (
      sn, pin, time, status, verify, workcode,
      maskflag, temperature, convtemperature, timeoffset,
      raw_line, received_at_utc
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        sn,
        pin,
        punch_time,
        rec.get("status", ""),
        rec.get("verify", ""),
        rec.get("workcode", ""),
        rec.get("maskflag", ""),
        rec.get("temperature", ""),
        rec.get("convtemperature", ""),
        rec.get("timeoffset", ""),
        raw_line,
        utc_now_iso(),
    ))
    conn.commit()
    conn.close()

# ============================================================================
# ZKTECO PROTOCOL ENDPOINTS
# ============================================================================

@app.route("/iclock/cdata", methods=["GET", "POST"])
@app.route("/iclock/cdata.aspx", methods=["GET", "POST"])
def iclock_cdata():
    """Main device initialization and data upload endpoint"""
    sn = request.args.get("SN", "").strip()
    if not sn:
        return Response("Missing SN", status=400, mimetype="text/plain")

    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "")
    pushver = request.args.get("pushver", "")
    language = request.args.get("language", "")

    if request.method == "GET":
        options = request.args.get("options", "")

        # Initialization handshake (options=all)
        if options == "all":
            upsert_device(sn, ip, pushver=pushver, language=language)

            # Send full configuration with zero stamps to force FULL re-sync of ALL records
            body = (
                f"GET OPTION FROM: {sn}\n"
                f"ATTLOGStamp=0\n"
                f"OPERLOGStamp=0\n"
                f"BIODATAStamp=0\n"
                f"ATTPHOTOStamp=0\n"
                f"USERStamp=0\n"
                f"ErrorDelay=30\n"
                f"Delay=3\n"
                f"TransTimes=\n"
                f"TransInterval=1\n"
                f"TransFlag=TransData AttLog\tOpLog\tEnrollUser\tChgUser\n"
                f"TimeZone=330\n"
                f"Realtime=0\n"
                f"Encrypt=None\n"
                f"ServerVer=2.2.14\n"
                f"PushProtVer={pushver or '2.2.14'}\n"
            )
            log_info(f"[INIT] Device {sn} ({ip}) - Full sync request: ATTLOGStamp=0 (will download ALL records)")
            return Response(body, status=200, mimetype="text/plain")

        # Other GET requests
        upsert_device(sn, ip, pushver=pushver, language=language)
        return Response("OK", status=200, mimetype="text/plain")

    # POST: Device uploads data
    upsert_device(sn, ip, pushver=pushver, language=language)

    table = request.args.get("table", "").strip().upper()
    raw_bytes = request.get_data() or b""
    text = raw_bytes.decode("utf-8", errors="ignore").strip()

    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    processed = 0
    
    # Log all POST data for debugging
    if text:
        log_info(f"[POST] Device {sn}: table={table}, lines={len(lines)}, data_size={len(raw_bytes)}")
        if len(lines) > 0:
            log_info(f"       First line: {lines[0][:100]}")

    # Handle USER table (various formats - per protocol, USER data comes with table=OPERLOG)
    if table in ["USER", "ENROLLUSER", "CHGUSER", "OPERLOG"]:
        for ln in lines:
            # Strip USER prefix if present, then parse KEY=VALUE format
            ln_stripped = ln.replace("USER", "", 1).strip() if ln.upper().startswith("USER") else ln
            # Try to parse - USER table usually has PIN, Name, Card, etc
            if "PIN" in ln.upper() or "=" in ln:
                kv = parse_kv_line(ln_stripped)
                if "PIN" in kv or "Pin" in kv:
                    upsert_user(sn, kv, raw_line=ln)
                    processed += 1
        if processed > 0:
            log_info(f"[{table or 'USER'}] Device {sn}: {processed} employee records")
            return Response(f"OK: {processed}", status=200, mimetype="text/plain")

    if table == "ATTLOG":
        for ln in lines:
            rec = parse_attlog_record(ln)
            if rec:
                insert_attlog(sn, rec, raw_line=ln)
                processed += 1
        
        if processed > 0:
            # Show progress
            conn = db()
            total = conn.execute("SELECT COUNT(*) c FROM attlog WHERE sn=?", (sn,)).fetchone()["c"]
            conn.close()
            log_info(f"[ATTLOG] Device {sn}: +{processed} records (Total: {total})")
        
        return Response(f"OK: {processed}", status=200, mimetype="text/plain")

    return Response(f"OK: {len(lines)}", status=200, mimetype="text/plain")


@app.route("/iclock/getrequest", methods=["GET"])
@app.route("/iclock/getrequest.aspx", methods=["GET"])
def iclock_getrequest():
    """Device polling endpoint (heartbeat)"""
    sn = request.args.get("SN", "").strip()
    if sn:
        ip = request.headers.get("X-Forwarded-For", request.remote_addr or "")
        info = request.args.get("INFO", "")
        upsert_device(sn, ip, info=info)
        
        # Check if device has sent USER data yet
        conn = db()
        user_count = conn.execute("SELECT COUNT(*) c FROM users WHERE sn=?", (sn,)).fetchone()["c"]
        conn.close()
        
        # If no users yet, send download command to pull all USER data
        if user_count == 0:
            body = (
                f"C:Download\n"
                f"table:USER\n"
                f"Stamp=0\n"
            )
            return Response(body, status=200, mimetype="text/plain")
    
    return Response("OK", status=200, mimetype="text/plain")


@app.route("/iclock/ping", methods=["GET", "POST"])
def iclock_ping():
    """Ping endpoint"""
    return Response("OK", status=200, mimetype="text/plain")


@app.route("/iclock/devicecmd", methods=["POST"])
def iclock_devicecmd():
    """Device command response"""
    return Response("OK", status=200, mimetype="text/plain")

@app.route("/admin/force-sync/<sn>", methods=["GET"])
def admin_force_sync(sn: str):
    """Force a device to re-sync all data by marking stamps as expired"""
    conn = db()
    device = conn.execute("SELECT * FROM devices WHERE sn=?", (sn,)).fetchone()
    conn.close()
    
    if not device:
        return {"error": "Device not found"}, 404
    
    # Send download command with zero timestamp to force full sync
    body = (
        f"C:Download\n"
        f"table:USER\n"
        f"Stamp=0\n"
        f"---\n"
        f"C:Download\n"
        f"table:ATTLOG\n"
        f"Stamp=0\n"
    )
    
    log_info(f"[ADMIN] Force-sync triggered for device {sn}")
    return Response(body, status=200, mimetype="text/plain")

@app.route("/admin/devices", methods=["GET"])
def admin_devices():
    """List all connected devices - JSON API"""
    conn = db()
    devices = conn.execute("SELECT sn, last_seen_utc, last_ip, info FROM devices ORDER BY last_seen_utc DESC").fetchall()
    conn.close()
    
    devices_list = [
        {
            "sn": d["sn"],
            "last_seen_utc": d["last_seen_utc"],
            "last_ip": d["last_ip"],
            "info": d["info"]
        }
        for d in devices
    ]
    return jsonify({"devices": devices_list})

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.route("/api/stats", methods=["GET"])
def api_stats():
    """Get server statistics - JSON API"""
    conn = db()
    devices_cnt = conn.execute("SELECT COUNT(*) c FROM devices").fetchone()["c"]
    users_cnt = conn.execute("SELECT COUNT(*) c FROM users").fetchone()["c"]
    attlog_cnt = conn.execute("SELECT COUNT(*) c FROM attlog").fetchone()["c"]
    
    # Get per-device stats
    device_stats = conn.execute("""
        SELECT d.sn, d.last_seen_utc, 
               (SELECT COUNT(*) FROM users WHERE sn=d.sn) as user_count,
               (SELECT COUNT(*) FROM attlog WHERE sn=d.sn) as att_count
        FROM devices d
        ORDER BY d.last_seen_utc DESC
    """).fetchall()
    
    conn.close()
    
    return jsonify({
        "total_devices": devices_cnt,
        "total_users": users_cnt,
        "total_attendance_records": attlog_cnt,
        "devices": [{
            "sn": d["sn"],
            "last_seen": d["last_seen_utc"],
            "employees": d["user_count"],
            "attendance_records": d["att_count"]
        } for d in device_stats],
        "server_time": utc_now_iso()
    })

# ============================================================================
# MAIN
# ============================================================================

def _run_flask() -> None:
    global _http_server
    from werkzeug.serving import make_server
    _http_server = make_server(APP_HOST, APP_PORT, app)
    _http_server.serve_forever()

def _shutdown_http_server() -> None:
    global _http_server
    srv = _http_server
    if srv is None:
        return
    try:
        srv.shutdown()
    except Exception:
        pass

if __name__ == "__main__":
    init_db()

    def _handle_signal(_signum: int, _frame: object) -> None:
        _shutdown_http_server()

    signal.signal(signal.SIGINT, _handle_signal)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _handle_signal)

    log_info(f"Starting ZKTeco Push Server on {APP_HOST}:{APP_PORT}")
    log_info("Database storage only - ERPNext integration removed")
    _run_flask()
