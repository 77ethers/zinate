#!/bin/bash

# Script to deploy Zinate Cloudflare Workers with environment variables
echo "=== Zinate Cloudflare Workers Deployment Script ==="

# Check if .env file exists in project root
if [ -f "../.env" ]; then
  echo "Loading environment variables from ../.env"
  export $(grep -v '^#' ../.env | xargs)
else
  echo "Error: .env file not found in project root. Please create one with the required API keys."
  exit 1
fi

# Function to set a secret for a worker environment
set_secret() {
  local env_name=$1
  local secret_name=$2
  local secret_value=$3
  
  echo "Setting $secret_name for $env_name environment..."
  echo $secret_value | wrangler secret put $secret_name -e $env_name
}

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Set up secrets for each worker environment
echo "\n=== Setting up environment variables ==="

# Story Planner Worker
set_secret "story_planner" "OPENAI_API_KEY" "$OPENAI_API_KEY"

# Content Generator Worker
set_secret "content_generator" "OPENAI_API_KEY" "$OPENAI_API_KEY"

# Image Generator Worker
set_secret "image_generator" "OPENAI_API_KEY" "$OPENAI_API_KEY"
set_secret "image_generator" "RUNWARE_API_KEY" "$RUNWARE_API_KEY"

# Main Zine Worker
set_secret "zine" "STORY_PLANNER_WORKER_URL" "https://story-planner.zinate.workers.dev"
set_secret "zine" "CONTENT_GENERATOR_WORKER_URL" "https://content-generator.zinate.workers.dev"
set_secret "zine" "IMAGE_GENERATOR_WORKER_URL" "https://image-generator.zinate.workers.dev"

# Deploy each worker
echo "\n=== Deploying workers ==="

echo "\nDeploying Story Planner Worker..."
wrangler deploy -e story_planner story-planner-worker.js

echo "\nDeploying Content Generator Worker..."
wrangler deploy -e content_generator content-generator-worker.js

echo "\nDeploying Image Generator Worker..."
wrangler deploy -e image_generator image-generator-worker.js

echo "\nDeploying Main Zine Worker..."
wrangler deploy -e zine zine-worker.js

echo "\n=== Deployment completed ==="
echo "Your workers have been deployed to the following URLs:"
echo " - Story Planner: https://story-planner.zinate.workers.dev"
echo " - Content Generator: https://content-generator.zinate.workers.dev"
echo " - Image Generator: https://image-generator.zinate.workers.dev"
echo " - Main Zine Worker: https://api.zinate.workers.dev"
echo ""
echo "Make sure these URLs match the ones in your .env file for client-side access."
