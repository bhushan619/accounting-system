#!/bin/bash

set -e

ZIP_FILE=$(ls velosync-docker-bundle_*.zip | head -n 1)

echo "=== Extracting $ZIP_FILE ==="
unzip "$ZIP_FILE" -d ./bundle

cd ./bundle/docker-bundle

echo "=== Loading Docker images ==="
docker load -i backend.tar
docker load -i frontend.tar
docker load -i mongo.tar

echo "=== Starting stack ==="
docker-compose up -d

echo "VeloSync stack is now running."
