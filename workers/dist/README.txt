# Zinate Cloudflare Workers Deployment Guide

This directory contains bundled worker files that you can directly upload to the Cloudflare Dashboard.

## Deployment Steps

1. Log in to your Cloudflare Dashboard: https://dash.cloudflare.com/
2. Navigate to "Workers & Pages" in the left sidebar
3. Click "Create application" > "Create Worker"
4. For each worker:
   - Name it according to the worker file (e.g., "zinate-story-planner")
   - Upload the corresponding JavaScript file
   - Add the necessary environment variables as described below

## Worker Configuration

### Story Planner Worker (story-planner-worker.js)
- Name: zinate-story-planner
- Route: story-planner.zinate.workers.dev
- Environment Variables:
  - OPENAI_API_KEY: Your OpenAI API key

### Content Generator Worker (content-generator-worker.js)
- Name: zinate-content-generator
- Route: content-generator.zinate.workers.dev
- Environment Variables:
  - OPENAI_API_KEY: Your OpenAI API key

### Image Generator Worker (image-generator-worker.js)
- Name: zinate-image-generator
- Route: image-generator.zinate.workers.dev
- Environment Variables:
  - OPENAI_API_KEY: Your OpenAI API key
  - RUNWARE_API_KEY: Your Runware API key

### Main Zine Worker (zine-worker.js)
- Name: zinate-main
- Route: api.zinate.workers.dev
- Environment Variables:
  - STORY_PLANNER_WORKER_URL: https://story-planner.zinate.workers.dev
  - CONTENT_GENERATOR_WORKER_URL: https://content-generator.zinate.workers.dev
  - IMAGE_GENERATOR_WORKER_URL: https://image-generator.zinate.workers.dev

## After Deployment

After deploying all workers, update your frontend environment variables to point to the correct worker URLs:

```
NEXT_PUBLIC_STORY_PLANNER_WORKER_URL="https://story-planner.zinate.workers.dev"
NEXT_PUBLIC_CONTENT_GENERATOR_WORKER_URL="https://content-generator.zinate.workers.dev"
NEXT_PUBLIC_IMAGE_GENERATOR_WORKER_URL="https://image-generator.zinate.workers.dev"
NEXT_PUBLIC_ZINE_WORKER_URL="https://api.zinate.workers.dev"
NEXT_PUBLIC_USE_DIRECT_WORKER="true"
```

This will enable your enhanced zine reader, with all its features (zoom functionality, thumbnail navigation, keyboard shortcuts, etc.), to connect directly to the Cloudflare Workers.
