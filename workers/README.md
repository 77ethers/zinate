# Zinate Cloudflare Workers

This directory contains Cloudflare Worker scripts that power the Zinate mythic zine generator. These workers handle different aspects of the zine generation process and can be deployed to Cloudflare's edge network for improved performance and scalability.

## Worker Services

1. **Story Planner Worker** (`story-planner-worker.js`)
   - Generates the narrative structure and story arc for a zine
   - Uses OpenAI GPT-4o

2. **Content Generator Worker** (`content-generator-worker.js`)
   - Creates detailed text content and image prompts for each page
   - Uses OpenAI GPT-4o-mini

3. **Image Generator Worker** (`image-generator-worker.js`)
   - Generates images for each page based on image prompts
   - Uses Runware API with fallback to DALL-E 3

4. **Main Zine Worker** (`zine-worker.js`)
   - Coordinates the entire zine generation process
   - Calls the other worker services in sequence

## Deployment Instructions

### Prerequisites

1. Install Wrangler CLI (Cloudflare Workers CLI):
   ```bash
   npm install -g wrangler
   ```

2. Login to your Cloudflare account:
   ```bash
   wrangler login
   ```

### Configuration

The `wrangler.toml` file contains the configuration for all workers. Make sure your environment variables are properly set in your `.env` file, including:

- `OPENAI_API_KEY`
- `RUNWARE_API_KEY`
- `CLOUDFLARE_API_KEY`
- `CLOUDFLARE_EMAIL`

### Deploying Workers

1. Install dependencies:
   ```bash
   cd workers
   npm install
   ```

2. Deploy all workers at once:
   ```bash
   npm run deploy:all
   ```

   Or deploy individual workers:
   ```bash
   npm run deploy:story    # Deploy Story Planner Worker
   npm run deploy:content  # Deploy Content Generator Worker
   npm run deploy:image    # Deploy Image Generator Worker
   npm run deploy:zine     # Deploy Main Zine Worker
   ```

3. After deployment, update your `.env` file with the deployed worker URLs (they should match what's in `wrangler.toml`).

## Client Integration

The project includes two ways to use the Cloudflare Workers:

1. **Direct Client Access** - The React client communicates directly with the Workers using the `ClientWorkerAdapter` and `useWorkerServices` hook. Set `NEXT_PUBLIC_USE_DIRECT_WORKER=true` in your `.env` file to enable this.

2. **API Route Proxy** - The Next.js API routes proxy requests to the Workers. This is used when `NEXT_PUBLIC_USE_DIRECT_WORKER=false` or not set.

## Local Development

You can develop and test workers locally using Wrangler's dev mode:

```bash
wrangler dev story-planner-worker.js --env story_planner
```

This will start a local server that simulates the Cloudflare Workers environment.

## Troubleshooting

- If you encounter CORS issues, check that the CORS headers in the worker scripts are properly configured.
- Make sure your API keys are correctly set in the environment variables.
- Check Cloudflare Worker logs in the Cloudflare dashboard for debugging information.
