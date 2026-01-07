#!/bin/bash
set -e

BUNDLE_NAME="accounting-app-bundle"
OUTPUT_DIR="./accounting-app"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Explicit image names (MUST match docker-compose.yml)
BACKEND_IMAGE="accounting-system-backend:latest"
FRONTEND_IMAGE="accounting-system-frontend:latest"
MONGO_IMAGE="mongo:8.0"

mkdir -p "$OUTPUT_DIR"

echo "=== Building Docker images ==="
docker compose build --no-cache backend frontend

echo "=== Verifying images ==="
docker image inspect "$BACKEND_IMAGE" >/dev/null
docker image inspect "$FRONTEND_IMAGE" >/dev/null

echo "Backend image  : $BACKEND_IMAGE"
echo "Frontend image : $FRONTEND_IMAGE"
echo "Mongo image    : $MONGO_IMAGE"

echo "=== Pulling mongo image if not present ==="
docker pull "$MONGO_IMAGE"

echo "=== Saving images to tar files ==="
docker save -o "$OUTPUT_DIR/backend.tar" "$BACKEND_IMAGE"
docker save -o "$OUTPUT_DIR/frontend.tar" "$FRONTEND_IMAGE"
docker save -o "$OUTPUT_DIR/mongo.tar" "$MONGO_IMAGE"

echo "=== Copying compose files ==="
cp docker-compose.yml "$OUTPUT_DIR/"
[ -f .env ] && cp .env "$OUTPUT_DIR/"

echo "=== Creating ZIP bundle ==="
zip -r "${BUNDLE_NAME}_${TIMESTAMP}.zip" "$OUTPUT_DIR"

echo ""
echo "Bundle created: ${BUNDLE_NAME}_${TIMESTAMP}.zip"
echo "Transfer to another system and run the restore script."
