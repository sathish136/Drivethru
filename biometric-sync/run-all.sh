#!/bin/bash

echo "Starting API Server..."
pnpm --filter @workspace/api-server run dev &

echo "Starting Attendance Service..."
pnpm --filter @workspace/attendance run dev &

echo "Starting Biometric Sync..."
cd biometric-sync
python3 sync.py &

wait
