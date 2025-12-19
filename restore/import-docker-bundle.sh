#!/bin/bash

set -e

ZIP_FILE=$(ls accounting-app-bundle_*.zip | head -n 1)

echo "=== Extracting $ZIP_FILE ==="
unzip "$ZIP_FILE" -d ./bundle

cd ./bundle/accounting-app

echo "=== Loading Docker images ==="
docker load -i backend.tar
docker load -i frontend.tar
docker load -i mongo.tar

echo "=== Starting stack ==="
docker-compose up -d

echo "Accounting app is now running."
