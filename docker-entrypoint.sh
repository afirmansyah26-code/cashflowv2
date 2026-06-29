#!/bin/sh
set -e

echo "Starting Cashflow Next standalone deployment sequence..."

echo "1. Verifying storage directories..."
# Use mkdir -p defensively, ignoring errors if permissions are restricted on the host
mkdir -p storage/private/bukti || true
mkdir -p storage/private/attachments || true
mkdir -p storage/private/documents || true
mkdir -p storage/public/kop-surat || true
mkdir -p storage/public/assets || true

echo "2. Running database migrations..."
max_retries=30
counter=0
until npx prisma migrate deploy > /dev/null 2>&1; do
    counter=$((counter+1))
    if [ $counter -gt $max_retries ]; then
        echo "Error: Database connection timeout."
        exit 1
    fi
    echo "Database unavailable or not ready - sleeping 2s ($counter/$max_retries)"
    sleep 2
done

echo "Database migrations applied successfully."

echo "3. Starting Next.js standalone application..."
exec node server.js
