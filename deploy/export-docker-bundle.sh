#!/bin/bash

set -e

BUNDLE_NAME="velosync-docker-bundle"
OUTPUT_DIR="./docker-bundle"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p $OUTPUT_DIR

echo "=== Building Docker images ==="
docker-compose build

echo "=== Detecting built image names ==="

# List all images and detect the last built ones
BACKEND_IMAGE=$(docker images --format "{{.Repository}}" | grep backend | head -n 1)
FRONTEND_IMAGE=$(docker images --format "{{.Repository}}" | grep frontend | head -n 1)

# Fallback if grep didn't find correct names
[ -z "$BACKEND_IMAGE" ] && BACKEND_IMAGE="velosync-code-backend"
[ -z "$FRONTEND_IMAGE" ] && FRONTEND_IMAGE="velosync-code-frontend"

MONGO_IMAGE="mongo:6.0"

echo "Backend image  : $BACKEND_IMAGE"
echo "Frontend image : $FRONTEND_IMAGE"
echo "Mongo image    : $MONGO_IMAGE"

echo "=== Pulling mongo image if not present ==="
docker pull $MONGO_IMAGE

echo "=== Saving images to tar files ==="
docker save -o $OUTPUT_DIR/backend.tar $BACKEND_IMAGE
docker save -o $OUTPUT_DIR/frontend.tar $FRONTEND_IMAGE
docker save -o $OUTPUT_DIR/mongo.tar $MONGO_IMAGE

echo "=== Copying compose files ==="
cp docker-compose.yml $OUTPUT_DIR/
[ -f .env ] && cp .env $OUTPUT_DIR/

echo "=== Creating ZIP bundle ==="
zip -r ${BUNDLE_NAME}_${TIMESTAMP}.zip $OUTPUT_DIR

echo ""
echo "Bundle created: ${BUNDLE_NAME}_${TIMESTAMP}.zip"
echo "Transfer to another system and run the restore script."
