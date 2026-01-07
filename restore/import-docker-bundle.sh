#!/bin/bash
set -e

ZIP_FILE=$(ls accounting-app-bundle_*.zip | head -n 1)

if [ -z "$ZIP_FILE" ]; then
  echo "❌ No bundle ZIP found"
  exit 1
fi

echo "=== Extracting $ZIP_FILE ==="
rm -rf ./bundle
unzip "$ZIP_FILE" -d ./bundle

cd ./bundle/accounting-app

echo "=== Loading Docker images ==="
docker load -i backend.tar
docker load -i frontend.tar
docker load -i mongo.tar

echo "=== Verifying docker-compose.yml has NO build directives ==="
if grep -q "build:" docker-compose.yml; then
  echo "❌ ERROR: docker-compose.yml contains 'build:'"
  echo "Remove all build sections before importing."
  exit 1
fi

echo "=== Starting stack (NO BUILD) ==="
docker compose up -d --no-build

echo ""
echo "✅ Accounting app is now running."
