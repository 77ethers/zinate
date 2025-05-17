# ZineQuest - AI Mythic Zine Creator

ZineQuest is a Next.js web application that allows users to generate scroll-triggered, AI-generated mythic zines. It blends vibrant Indian comic art with concise captions, creating an illusion of an endless, living graphic novel based on user prompts.

This project was architected and developed with the assistance of Cascade, an agentic AI coding assistant by Windsurf.

## Features

- **AI-Generated Content**: Leverages OpenAI's GPT-4o-mini for captions and DALL·E 3 for images.
- **Infinite Scroll**: Dynamically loads new zine pages as the user scrolls.
- **Responsive Design**: Adapts to mobile and desktop screens.
- **Aesthetic UI**: Features glassmorphism and iridescent background effects.
- **Prompt-driven**: Users enter a creative prompt to start their zine.
- **Cloudflare Workers**: Edge-based processing for improved performance and scalability.
- **Runware Integration**: Advanced image generation with Runware API, fallback to DALL-E.
- **Zoom & Navigation**: Interactive zoom functionality and thumbnail navigation.
- **Keyboard Controls**: Comprehensive keyboard shortcuts with help overlay.
- **Rate Limiting**: Basic client-side and server-side rate limiting to manage API usage.

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes + Cloudflare Workers
- **AI**: OpenAI API (GPT-4o, GPT-4o-mini, DALL·E 3), Runware API
- **Edge Computing**: Cloudflare Workers for distributed processing
- **Styling**: Tailwind CSS, CSS Modules

## Project Structure

```
/Users/ekansh/zinate/
├── components/         # React components (Hero, PromptInput, ZineItem, ZineViewer)
├── hooks/              # React hooks (useWorkerServices)
├── pages/
│   ├── api/            # API routes (generate.js, progress.js)
│   ├── _app.js         # Custom App component
│   └── index.js        # Main homepage
├── public/             # Static assets (e.g., favicon)
├── services/           # Service layer for API communication
│   ├── client-worker-adapter.js  # Direct Cloudflare Worker client
│   ├── content-image-generator.js # Content generation service
│   ├── image-generator.js         # Image generation service
│   ├── story-planner.js           # Story planning service
│   ├── worker-adapter.js          # Server-side worker adapter
│   └── zine-service.js            # Main zine generation service
├── styles/             # Global styles (globals.css)
├── workers/            # Cloudflare Worker scripts
│   ├── content-generator-worker.js # Content generation worker
│   ├── image-generator-worker.js   # Image generation worker
│   ├── story-planner-worker.js     # Story planning worker
│   ├── zine-worker.js              # Main coordination worker
│   ├── wrangler.toml               # Cloudflare Worker configuration
│   └── package.json                # Worker dependencies
├── .env.example        # Example environment variables
├── .gitignore          # Git ignore file
├── next.config.js      # Next.js configuration (if needed, default for now)
├── package.json        # Project dependencies and scripts
├── postcss.config.js   # PostCSS configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── README.md           # This file
```

## Setup

1.  **Clone the repository (if applicable) or ensure you have the project files.**

2.  **Navigate to the project directory:**
    ```bash
    cd /Users/ekansh/zinate
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Set up environment variables:**
    Copy the `.env.example` file to a new file named `.env` (or `.env.local`):
    ```bash
    cp .env.example .env.local
    ```
    Open `.env.local` and add your API keys and worker configurations:
    ```env
    # API Keys
    OPENAI_API_KEY="your_openai_api_key_here"
    RUNWARE_API_KEY="your_runware_api_key_here"
    CLOUDFLARE_API_KEY="your_cloudflare_api_key_here"
    CLOUDFLARE_EMAIL="your_cloudflare_email_here"
    
    # Cloudflare Worker URLs (after deployment)
    NEXT_PUBLIC_STORY_PLANNER_WORKER_URL="https://story-planner.zinate.workers.dev"
    NEXT_PUBLIC_CONTENT_GENERATOR_WORKER_URL="https://content-generator.zinate.workers.dev"
    NEXT_PUBLIC_IMAGE_GENERATOR_WORKER_URL="https://image-generator.zinate.workers.dev"
    NEXT_PUBLIC_ZINE_WORKER_URL="https://api.zinate.workers.dev"
    
    # Feature flags
    NEXT_PUBLIC_USE_DIRECT_WORKER="true"  # Set to 'true' to use workers directly from the client
    ```

## Running the Development Server

Once the setup is complete, you can run the development server:

```bash
npm run dev
```

This will start the application, typically on `http://localhost:3000`.
Open this URL in your browser to see ZineQuest in action.

## Building for Production

To build the application for production:

```bash
npm run build
```

To start the production server after building:

```bash
npm run start
```

## MVP Checklist from Original Spec

- [x] Landing hero with animations & prompt field.
- [x] `/api/generate` edge function calling OpenAI.
- [x] Render first 3 zine pages.
- [x] Infinite scroll with loading sentinel.
- [x] Basic error handling + retry button.
- [x] Mobile & desktop responsive (basic structure set up with Tailwind, needs testing).

## Enhanced Features

- [x] Cloudflare Workers for edge computing
- [x] Zoom functionality (click on image or use 'Z' key to zoom)
- [x] Thumbnail navigation side panel (toggle with 'T' key)
- [x] Comprehensive keyboard shortcuts (toggle help with '?' or 'H')
- [x] Reading progress indicator
- [x] Improved control buttons for interaction
- [x] Responsive design with proper media queries

## Deploying Cloudflare Workers

This project uses Cloudflare Workers for improved performance. To deploy the workers:

1. Navigate to the workers directory:
   ```bash
   cd workers
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Deploy all workers:
   ```bash
   npm run deploy:all
   ```

See the workers/README.md file for more detailed deployment instructions.

