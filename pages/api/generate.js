import ZineService from '../../services/zine-service';
import WorkerAdapter from '../../services/worker-adapter';

// Basic in-memory store for rate limiting (per Vercel instance)
const requestTimestamps = {};
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per IP per minute (simplified)
const MIN_REQUEST_INTERVAL_MS = 5000; // Minimum 5 seconds between requests from the same IP (simplified)

// Whether to use Cloudflare Workers directly or the Next.js API route
const USE_DIRECT_WORKER = process.env.NEXT_PUBLIC_USE_DIRECT_WORKER === 'true';

// Initialize the zine service which coordinates all the component services
const zineService = new ZineService();

// Create a worker adapter instance for direct worker calls if enabled
const workerAdapter = new WorkerAdapter();
workerAdapter.useWorkers = true; // Always use workers in API routes

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // Simplified rate limiting (Vercel provides req.headers['x-forwarded-for'] for client IP)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!requestTimestamps[ip]) {
        requestTimestamps[ip] = [];
    }

    // Remove timestamps older than the window
    requestTimestamps[ip] = requestTimestamps[ip].filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

    if (requestTimestamps[ip].length >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({ message: 'Too many requests from this IP, please try again later.' });
    }

    const lastRequestTime = requestTimestamps[ip].length > 0 ? requestTimestamps[ip][requestTimestamps[ip].length - 1] : 0;
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL_MS) {
        return res.status(429).json({ message: 'Please wait a moment before sending another request.' });
    }

    requestTimestamps[ip].push(now);

    const { prompt } = req.query;

    if (!prompt || prompt.trim().length < 10) {
        return res.status(400).json({ message: 'Prompt must be at least 10 characters long.' });
    }

    try {
        console.log(`[API] Starting zine generation for prompt: "${prompt.substring(0, 30)}..."`);
        
        // Store the current generation ID and progress in global storage for SSE endpoint access
        // In a production environment, this would use Redis, a database, or another shared storage
        if (!global.zineProgress) {
            global.zineProgress = new Map();
        }
        
        // Set initial progress state
        const progressId = prompt.trim();
        global.zineProgress.set(progressId, { step: 'planning', updated: Date.now() });
        
        // Update the progress tracker with each step
        const progressTracker = (step) => {
            console.log(`[API] Zine generation progress: ${step}`);
            global.zineProgress.set(progressId, { step, updated: Date.now() });
        };
        
        // Decide whether to use the direct worker adapter or go through the zine service
        // Direct worker is faster since it skips the local service coordination
        const result = USE_DIRECT_WORKER
            ? await workerAdapter.generateZine(prompt.trim(), progressTracker)
            : await zineService.generateZine(prompt.trim(), progressTracker);
        
        if (!result.success) {
            console.error(`[API] Zine generation failed at stage ${result.stage}:`, result.error);
            return res.status(500).json({ 
                message: `Failed to generate zine: ${result.error}`,
                stage: result.stage,
                // If we have a partial story plan, include it
                storyPlan: result.storyPlan || null 
            });
        }
        
        // Format the zine pages into the expected format for the frontend
        const zineItems = result.zine.pages.map(page => ({
            imageUrl: page.imageUrl,
            caption: `<p>${page.text.replace(/\n/g, '<br/>')}</p>`,
            provider: page.provider,
            // Include additional metadata
            title: result.zine.title,
            pageNumber: page.pageNumber,
            error: page.error || null
        }));
        
        console.log(`[API] Successfully generated zine "${result.zine.title}" with ${zineItems.length} pages`);
        
        // Return the zine items to the frontend
        res.status(200).json({ 
            items: zineItems,
            // Include additional metadata
            title: result.zine.title,
            description: result.zine.description,
            prompt: prompt
        });

    } catch (error) {
        console.error('Error generating zine content:', error);
        if (error.response) { // Axios-like error structure from OpenAI library
            console.error('API Error Status:', error.response.status);
            console.error('API Error Data:', error.response.data);
        }
        res.status(500).json({ message: error.message || 'Failed to generate zine content.' });
    }
}
