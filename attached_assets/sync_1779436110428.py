#!/usr/bin/env python3
"""
Biometric Real-Time Sync
========================
Watches the ZKTeco push server SQLite database for new attendance punches
and syncs them to the Attendance Management API automatically.

Usage:
    python3 sync.py

Configuration (edit the CONFIG section below or set environment variables):
    API_URL       - Base URL of the Attendance API
    PUSH_DB_PATH  - Path to the push.db SQLite file from ZKTeco push server
    POLL_INTERVAL - How often to check for new rows (seconds)
    STATE_FILE    - File to persist last-synced timestamp
    LOG_FILE      - Log output file (leave empty to log to console only)
"""

import os
import sys
import time
import sqlite3
import logging
import tempfile
import requests
from datetime import datetime
from pathlib import Path

# ─── CONFIGURATION ────────────────────────────────────────────────────────────

API_URL = os.environ.get(
    "API_URL",
    "http://localhost:18764"           # change to your deployed API URL
)
PUSH_DB_PATH = os.environ.get(
    "PUSH_DB_PATH",
    "/home/erp/frappe-bench/erp-sync/push.db"
)
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "10"))   # seconds
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "500"))  # Process records in batches to avoid timeouts
STATE_FILE = os.environ.get(
    "STATE_FILE",
    os.path.join(os.path.dirname(__file__), ".sync_state")
)
LOG_FILE = os.environ.get("LOG_FILE", "")                    # empty = console

# ─── LOGGING SETUP ────────────────────────────────────────────────────────────

handlers = [logging.StreamHandler(sys.stdout)]
if LOG_FILE:
    handlers.append(logging.FileHandler(LOG_FILE))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=handlers,
)
log = logging.getLogger(__name__)


# ─── STATE: TRACK LAST SYNCED TIMESTAMP ──────────────────────────────────────

def load_last_synced() -> str:
    """Return the last synced timestamp string, or March 26 2026 if none."""
    try:
        with open(STATE_FILE, "r") as f:
            val = f.read().strip()
            if val:
                return val
    except FileNotFoundError:
        pass
    return "2026-03-01 00:00:00"


def save_last_synced(ts: str):
    """Persist the latest processed timestamp."""
    with open(STATE_FILE, "w") as f:
        f.write(ts)


# ─── READ NEW ROWS FROM push.db ──────────────────────────────────────────────

def fetch_new_rows(db_path: str, since: str) -> list[dict]:
    """
    Query attlog for rows with time > since.
    Returns list of dicts: {pin, time, status, verify, workcode, reserved}
    """
    if not Path(db_path).exists():
        log.warning(f"push.db not found at {db_path} — waiting...")
        return []

    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # Detect available columns (ZKTeco schema varies slightly)
        cur.execute("PRAGMA table_info(attlog)")
        cols = {row["name"] for row in cur.fetchall()}

        select_cols = ["pin", "time", "status"]
        for opt in ("verify", "workcode", "reserved"):
            if opt in cols:
                select_cols.append(opt)

        col_str = ", ".join(select_cols)
        cur.execute(
            f"SELECT {col_str} FROM attlog WHERE time > ? ORDER BY time ASC",
            (since,)
        )
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows

    except sqlite3.OperationalError as e:
        log.error(f"SQLite error: {e}")
        return []


# ─── BUILD TEMP DB WITH NEW ROWS AND UPLOAD ──────────────────────────────────

def build_temp_db(rows: list[dict]) -> str:
    """
    Create a temporary SQLite file containing only the given rows
    in the attlog table format expected by the API.
    Returns the path to the temp file.
    """
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()

    conn = sqlite3.connect(tmp.name)
    conn.execute("""
        CREATE TABLE attlog (
            pin       TEXT,
            time      TEXT,
            status    TEXT,
            verify    TEXT DEFAULT '0',
            workcode  TEXT DEFAULT '0',
            reserved  TEXT DEFAULT ''
        )
    """)
    conn.executemany(
        "INSERT INTO attlog (pin, time, status) VALUES (?, ?, ?)",
        [(r["pin"], r["time"], r.get("status", "0")) for r in rows]
    )
    conn.commit()
    conn.close()
    return tmp.name


def upload_to_api(db_path: str) -> dict:
    """Upload the SQLite DB file to the API sync endpoint."""
    url = f"{API_URL.rstrip('/')}/api/biometric/sync-sqlite"
    with open(db_path, "rb") as f:
        resp = requests.post(
            url,
            files={"db": ("push.db", f, "application/octet-stream")},
            timeout=300,  # Increase timeout to 5 minutes for large batches
        )
    resp.raise_for_status()
    return resp.json()


# ─── MAIN LOOP ────────────────────────────────────────────────────────────────

def main():
    log.info("=" * 60)
    log.info("Biometric Real-Time Sync started")
    log.info(f"  Watching : {PUSH_DB_PATH}")
    log.info(f"  API URL  : {API_URL}")
    log.info(f"  Interval : {POLL_INTERVAL}s")
    log.info("=" * 60)

    last_synced = load_last_synced()
    log.info(f"Resuming from timestamp: {last_synced}")

    while True:
        try:
            new_rows = fetch_new_rows(PUSH_DB_PATH, last_synced)

            if new_rows:
                latest_ts = new_rows[-1]["time"]
                count = len(new_rows)
                log.info(f"Found {count} new punch(es) — uploading to API in batches...")

                # Process in batches to avoid timeouts
                total_stats = {"created": 0, "updated": 0, "skipped": 0, "unmatched": 0}
                success = True
                
                for i in range(0, len(new_rows), BATCH_SIZE):
                    batch = new_rows[i:i + BATCH_SIZE]
                    batch_num = i // BATCH_SIZE + 1
                    total_batches = (len(new_rows) + BATCH_SIZE - 1) // BATCH_SIZE
                    
                    log.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} records)...")
                    
                    tmp_db = build_temp_db(batch)
                    try:
                        result = upload_to_api(tmp_db)
                        stats = result.get("stats", {})
                        
                        # Accumulate stats
                        for key in total_stats:
                            total_stats[key] += stats.get(key, 0)
                            
                        log.info(
                            f"Batch {batch_num} OK — created={stats.get('created', 0)}, "
                            f"updated={stats.get('updated', 0)}, "
                            f"skipped={stats.get('skipped', 0)}, "
                            f"unmatched={stats.get('unmatched', 0)}"
                        )
                    except Exception as e:
                        log.error(f"Batch {batch_num} failed: {e}")
                        success = False
                        break
                    finally:
                        os.unlink(tmp_db)
                
                if success:
                    log.info(
                        f"Total sync OK — created={total_stats['created']}, "
                        f"updated={total_stats['updated']}, "
                        f"skipped={total_stats['skipped']}, "
                        f"unmatched={total_stats['unmatched']}"
                    )
                    # Only advance the pointer on complete success
                    save_last_synced(latest_ts)
                    last_synced = latest_ts
                else:
                    log.error("Sync failed - will retry from same timestamp")
            else:
                log.debug("No new punches.")

        except requests.exceptions.ConnectionError:
            log.error(f"Cannot reach API at {API_URL} — will retry...")
        except requests.exceptions.HTTPError as e:
            log.error(f"API error: {e.response.status_code} — {e.response.text[:200]}")
        except Exception as e:
            log.exception(f"Unexpected error: {e}")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
