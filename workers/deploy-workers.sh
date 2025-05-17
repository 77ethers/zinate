#!/bin/bash

# Script to deploy Zinate Cloudflare Workers with secrets
echo "=== Zinate Cloudflare Workers Deployment Script ==="

# Check if .env file exists in project root
if [ -f "../.env" ]; then
  echo "Loading environment variables from ../.env"
  export $(grep -v '^#' ../.env | xargs)
else
  echo "Error: .env file not found in project root. Please create one with the required API keys."
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Deploy each worker and set its secrets
echo "\n=== Deploying Story Planner Worker ==="
wrangler deploy story-planner-worker.js -e story_planner
echo "Setting secrets for Story Planner Worker..."
echo $OPENAI_API_KEY | wrangler secret put OPENAI_API_KEY -e story_planner

echo "\n=== Deploying Content Generator Worker ==="
wrangler deploy content-generator-worker.js -e content_generator
echo "Setting secrets for Content Generator Worker..."
echo $OPENAI_API_KEY | wrangler secret put OPENAI_API_KEY -e content_generator

echo "\n=== Deploying Image Generator Worker ==="
wrangler deploy image-generator-worker.js -e image_generator
echo "Setting secrets for Image Generator Worker..."
echo $OPENAI_API_KEY | wrangler secret put OPENAI_API_KEY -e image_generator
echo $RUNWARE_API_KEY | wrangler secret put RUNWARE_API_KEY -e image_generator

echo "\n=== Deploying Main Zine Worker ==="
wrangler deploy zine-worker.js -e zine
echo "Setting secrets for Main Zine Worker..."
echo "https://zinate-story-planner.5da50c23999a6931d14015e4e37ee633.workers.dev" | wrangler secret put STORY_PLANNER_WORKER_URL -e zine
echo "https://zinate-content-generator.5da50c23999a6931d14015e4e37ee633.workers.dev" | wrangler secret put CONTENT_GENERATOR_WORKER_URL -e zine
echo "https://zinate-image-generator.5da50c23999a6931d14015e4e37ee633.workers.dev" | wrangler secret put IMAGE_GENERATOR_WORKER_URL -e zine

echo "\n=== Deployment completed ==="
echo "Your workers have been deployed to the following URLs:"
echo " - Story Planner: https://zinate-story-planner.5da50c23999a6931d14015e4e37ee633.workers.dev"
echo " - Content Generator: https://zinate-content-generator.5da50c23999a6931d14015e4e37ee633.workers.dev"
echo " - Image Generator: https://zinate-image-generator.5da50c23999a6931d14015e4e37ee633.workers.dev"
echo " - Main Zine Worker: https://zinate-main.5da50c23999a6931d14015e4e37ee633.workers.dev"
echo ""
echo "Make sure these URLs match the ones in your .env file for client-side access:"
echo "NEXT_PUBLIC_STORY_PLANNER_WORKER_URL=\"https://zinate-story-planner.5da50c23999a6931d14015e4e37ee633.workers.dev\""
echo "NEXT_PUBLIC_CONTENT_GENERATOR_WORKER_URL=\"https://zinate-content-generator.5da50c23999a6931d14015e4e37ee633.workers.dev\""
echo "NEXT_PUBLIC_IMAGE_GENERATOR_WORKER_URL=\"https://zinate-image-generator.5da50c23999a6931d14015e4e37ee633.workers.dev\""
echo "NEXT_PUBLIC_ZINE_WORKER_URL=\"https://zinate-main.5da50c23999a6931d14015e4e37ee633.workers.dev\""
