# Zinate Deployment Guide

This guide outlines the steps to deploy your enhanced Zinate mythic zine creator application with Cloudflare Workers.

## 1. Deploy Cloudflare Workers

Since we encountered issues with automated CLI deployment, follow these steps to manually deploy the workers through the Cloudflare Dashboard:

### Manual Deployment via Cloudflare Dashboard

1. Log in to your Cloudflare Dashboard: https://dash.cloudflare.com/
2. Navigate to "Workers & Pages" in the left sidebar
3. Click "Create application" > "Create Worker"

#### Deploy Story Planner Worker
- Name: `zinate-story-planner`
- Upload the file: `/workers/dist/story-planner-worker.js`
- After deployment, go to the worker settings and add this environment variable:
  - `OPENAI_API_KEY`: Your OpenAI API key
- Set a custom domain (optional): `story-planner.zinate.workers.dev`

#### Deploy Content Generator Worker
- Name: `zinate-content-generator`
- Upload the file: `/workers/dist/content-generator-worker.js`
- After deployment, add this environment variable:
  - `OPENAI_API_KEY`: Your OpenAI API key
- Set a custom domain (optional): `content-generator.zinate.workers.dev`

#### Deploy Image Generator Worker
- Name: `zinate-image-generator`
- Upload the file: `/workers/dist/image-generator-worker.js`
- After deployment, add these environment variables:
  - `OPENAI_API_KEY`: Your OpenAI API key
  - `RUNWARE_API_KEY`: Your Runware API key
- Set a custom domain (optional): `image-generator.zinate.workers.dev`

#### Deploy Main Zine Worker
- Name: `zinate-main`
- Upload the file: `/workers/dist/zine-worker.js`
- After deployment, add these environment variables:
  - `STORY_PLANNER_WORKER_URL`: URL of your deployed story planner worker
  - `CONTENT_GENERATOR_WORKER_URL`: URL of your deployed content generator worker
  - `IMAGE_GENERATOR_WORKER_URL`: URL of your deployed image generator worker
- Set a custom domain (optional): `api.zinate.workers.dev`

## 2. Configure Your Application

After deploying all workers, update your application's environment variables to connect to them:

1. Use the provided script to apply Cloudflare environment settings:
   ```bash
   ./apply-cloudflare-env.sh
   ```
   This script will copy the `.env.cloudflare` file to `.env` and display the applied settings.

2. Update the worker URLs in `.env.cloudflare` if you used different domains during deployment.

3. The script automatically sets `NEXT_PUBLIC_USE_DIRECT_WORKER="true"` to enable client-side orchestration, which bypasses worker-to-worker communication issues in Cloudflare's environment.

## 3. Deploy Your Next.js Application

You can deploy your Next.js application to your preferred hosting provider. Here are the steps for deploying to Vercel:

1. Push your code to a GitHub repository

2. Connect your repository to Vercel

3. Configure the following environment variables in the Vercel dashboard:
   - `OPENAI_API_KEY`
   - `RUNWARE_API_KEY`
   - `NEXT_PUBLIC_STORY_PLANNER_WORKER_URL`
   - `NEXT_PUBLIC_CONTENT_GENERATOR_WORKER_URL`
   - `NEXT_PUBLIC_IMAGE_GENERATOR_WORKER_URL`
   - `NEXT_PUBLIC_ZINE_WORKER_URL`
   - `NEXT_PUBLIC_USE_DIRECT_WORKER="true"`

4. Deploy your application

## Enhanced Features

Your deployed application will include all the enhanced zine reader features:

1. **Zoom functionality**: Click on an image or use the 'Z' key to zoom in/out. The cursor becomes a 'grab' handle when zoomed.

2. **Thumbnail navigation**: A side panel with thumbnails of all pages for quick navigation, which can be toggled with the 'T' key.

3. **Keyboard shortcuts**: Comprehensive keyboard navigation with a help overlay that can be toggled with '?' or 'H'. Shortcuts include zoom, thumbnails, and first/last page navigation.

4. **Reading progress indicator**: Progress bar at the top of the screen showing your position in the zine.

5. **Improved controls**: Intuitive control buttons in the bottom-right corner for thumbnails, zoom, and keyboard shortcut help.

All these features are responsive and will adapt to different screen sizes with appropriate media queries.

## Troubleshooting

### Worker Connectivity Issues

#### Client-Side Orchestration (Recommended)

The application now uses a client-side orchestration approach by default (`NEXT_PUBLIC_USE_DIRECT_WORKER="true"`), which solves worker-to-worker communication issues in Cloudflare's environment. This approach has the following advantages:

- Bypasses the limitations of worker-to-worker communication in Cloudflare
- Provides more detailed progress updates to the user during zine generation
- Allows for more robust error handling and recovery

The client-side orchestration works by having the frontend application call each worker directly in sequence:

1. First, it calls the story planner worker to generate a story plan
2. Next, it sends the story plan to the content generator worker
3. Finally, it sends each page's image prompt to the image generator worker

This approach eliminates the need for workers to communicate with each other directly.

#### Troubleshooting Steps

If your application still cannot connect to the Cloudflare Workers:

1. Check that the worker URLs in your `.env` file match the actual deployed worker URLs.

2. Verify that CORS is properly configured in the worker scripts (already done in the provided code).

3. Test each worker directly using curl or Postman to ensure they are responding correctly.

4. If client-side orchestration doesn't work in your environment, you can set `NEXT_PUBLIC_USE_DIRECT_WORKER="false"` to use the Next.js API routes as a fallback.

### API Key Issues

If you encounter errors related to API keys:

1. Verify that the API keys are correctly set in your Cloudflare Worker environment variables.

2. Check that the API keys have the necessary permissions and are active.

3. For local development, make sure your `.env` file contains valid API keys.

## Local Development

For local development after configuring the Cloudflare Workers:

```bash
npm run dev
```

Your application will connect to the deployed Cloudflare Workers while running locally, providing the full feature set of your enhanced zine reader.
