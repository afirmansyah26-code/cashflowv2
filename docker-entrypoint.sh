#!/bin/sh
set -e

echo "Starting Cashflow Next standalone deployment sequence..."

echo "1. Verifying storage directories..."
mkdir -p storage/private/bukti || true
mkdir -p storage/private/attachments || true
mkdir -p storage/private/documents || true
mkdir -p storage/public/kop-surat || true
mkdir -p storage/public/assets || true

echo "2. Running database migrations..."
max_retries=30
counter=0
success=false

while [ $counter -lt $max_retries ]; do
    set +e
    output=$(npx prisma migrate deploy 2>&1)
    exit_code=$?
    set -e

    if [ $exit_code -eq 0 ]; then
        echo "$output"
        echo "Database migrations applied successfully."
        success=true
        break
    fi

    if echo "$output" | grep -q "P1001\|Can't reach database server\|Connection refused\|timed out"; then
        counter=$((counter+1))
        echo "Database unavailable - sleeping 2s ($counter/$max_retries)"
        sleep 2
    else
        echo "Fatal error during database migration:"
        echo "$output"
        exit 1
    fi
done

if [ "$success" = false ]; then
    echo "Error: Database connection timeout."
    exit 1
fi

echo "3. Starting Next.js standalone application..."
exec node server.js
