#!/bin/bash

# Script to apply Cloudflare environment settings
echo "Applying Cloudflare environment configuration..."

# Copy the Cloudflare environment file to .env
cp .env.cloudflare .env

echo "Environment configured for Cloudflare Workers."
echo "The following settings have been applied:"
grep -v "^#" .env | grep -v "^$"

echo "
Now using client-side orchestration with direct worker communication."
echo "This bypasses worker-to-worker communication issues in Cloudflare's environment."
