import OpenAI from 'openai';
import { Runware } from '@runware/sdk-js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Runware client
const runware = new Runware({ apiKey: process.env.RUNWARE_API_KEY });

// Timeout for image generation in milliseconds (8 seconds)
const IMAGE_GENERATION_TIMEOUT = 8000;

// Basic in-memory store for rate limiting (per Vercel instance)
const requestTimestamps = {};
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per IP per minute (simplified)
const MIN_REQUEST_INTERVAL_MS = 5000; // Minimum 5 seconds between requests from the same IP (simplified)

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

    const { prompt, count = 3 } = req.query;

    if (!prompt || prompt.trim().length < 10) {
        return res.status(400).json({ message: 'Prompt must be at least 10 characters long.' });
    }

    const numPages = parseInt(count, 10);
    if (isNaN(numPages) || numPages <= 0 || numPages > 5) {
        return res.status(400).json({ message: 'Count must be a number between 1 and 5.' });
    }

    try {
        // Step 1: Generate N captions based on the main prompt
        // Using the model from api-example.js: gpt-4.1-mini
        // The user's example showed `client.responses.create`, adapting to chat completions structure
        const captionPrompt = `You are a storyteller for a mythic zine. 
        Given the theme: "${prompt}".
        Generate ${numPages} short, vivid, and poetic captions for consecutive zine pages. Each caption should be one or two sentences. 
        The captions should tell a micro-story or describe evolving scenes related to the theme.
        Return the captions as a JSON array of strings. For example: ["Caption 1 a short story.", "Caption 2 another part."]
        Do not include any other text or explanation, only the JSON array.
        Ensure the JSON is valid.`;

        const chatCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Using gpt-4o-mini as per spec, as gpt-4.1-mini not standard identifier in library
            messages: [{ role: "user", content: captionPrompt }],
            temperature: 0.7,
            max_tokens: numPages * 50, // Estimate tokens for captions
            response_format: { type: "json_object" }, // Request JSON output
        });

        let captions = [];
        try {
            const parsedJson = JSON.parse(chatCompletion.choices[0].message.content);
            // Assuming the model returns an object like { "captions": ["caption1", "caption2"] }
            // or directly an array. Adjust based on actual model output structure.
            if (Array.isArray(parsedJson)) {
                 captions = parsedJson;
            } else if (parsedJson.captions && Array.isArray(parsedJson.captions)){
                captions = parsedJson.captions;
            } else if (parsedJson.items && Array.isArray(parsedJson.items)){
                captions = parsedJson.items; // try 'items' as another common key
            } else {
                 // If the model doesn't produce the expected JSON array structure despite prompt engineering
                console.error("Unexpected JSON structure from GPT for captions:", chatCompletion.choices[0].message.content);
                // Fallback: try to split by newline if it's a list
                captions = chatCompletion.choices[0].message.content.split('\n').filter(c => c.trim() !== '').slice(0, numPages);
                if (captions.length === 0) throw new Error('Failed to parse captions from AI response.');
            }
        } catch (e) {
            console.error("Error parsing captions JSON from AI:", e);
            console.error("Raw AI response for captions:", chatCompletion.choices[0].message.content);
            // Fallback: use the raw content as a single caption if parsing fails badly
            captions = [chatCompletion.choices[0].message.content.substring(0,150)];
            // Or, throw an error to indicate failure to the user
            // throw new Error('Failed to parse captions from AI. The AI response was not in the expected format.');
        }
        
        if (captions.length === 0) {
            throw new Error('AI did not generate any captions.');
        }
        // Ensure we only take up to numPages captions, in case AI gives more
        captions = captions.slice(0, numPages);


        // Step 2: For each caption, generate an image using Runware with DALL-E as fallback
        const zineItems = [];
        for (const caption of captions) {
            const imagePrompt = `Vibrant Indian comic art style, epic mythology. Scene: ${caption}`;
            console.log('[Debug] Generating image with prompt (first 100 chars):', imagePrompt.substring(0, 100));
            
            // Create a function to generate image with Runware
            const generateWithRunware = async () => {
                try {
                    console.log('[Debug Runware] Attempting to generate image with Runware');
                    const result = await runware.requestImages({
                        positivePrompt: imagePrompt,
                        width: 1024,
                        height: 1024,
                        numberResults: 1, // Generate one image
                        // Using the specified model from the config
                        model: 'runware:101@1',
                        // Output configuration
                        outputType: 'URL',
                        outputFormat: 'JPEG',
                        // Quality parameters
                        steps: 28,
                        CFGScale: 3.5,
                        scheduler: 'FlowMatchEulerDiscreteScheduler',
                        includeCost: true
                    });
                    
                    console.log('[Debug Runware] Response received');
                    if (result && result.length > 0 && result[0].imageURL) {
                        return { 
                            success: true, 
                            imageUrl: result[0].imageURL,
                            provider: 'runware' 
                        };
                    } else {
                        console.error('[Debug Runware] No valid image URL returned');
                        return { success: false, error: 'No image URL returned from Runware' };
                    }
                } catch (error) {
                    console.error('[Debug Runware] Error:', error);
                    return { success: false, error: error.message || 'Unknown Runware error' };
                }
            };
            
            // Create a function to generate image with DALL-E (fallback)
            const generateWithDallE = async () => {
                try {
                    console.log('[Debug DALL-E] Attempting to generate image with DALL-E');
                    const imageResult = await openai.images.generate({
                        model: "dall-e-3",
                        prompt: imagePrompt,
                        quality: "standard",
                        n: 1,
                        size: "1024x1024"
                    });

                    if (imageResult.data && imageResult.data[0] && imageResult.data[0].url) {
                        return { 
                            success: true, 
                            imageUrl: imageResult.data[0].url,
                            provider: 'dalle' 
                        };
                    } else {
                        console.error('[Debug DALL-E] Unexpected response structure');
                        return { success: false, error: 'Unexpected response from DALL-E' };
                    }
                } catch (error) {
                    console.error('[Debug DALL-E] Error:', error);
                    return { success: false, error: error.message || 'Unknown DALL-E error' };
                }
            };
            
            // Try to generate with Runware first, with a timeout
            try {
                // Create a promise that resolves after the timeout
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Runware timeout')), IMAGE_GENERATION_TIMEOUT)
                );
                
                // Race between Runware generation and timeout
                const runwareResult = await Promise.race([
                    generateWithRunware(),
                    timeoutPromise
                ]);
                
                if (runwareResult.success) {
                    console.log('[Debug] Successfully generated image with Runware');
                    zineItems.push({ 
                        imageUrl: runwareResult.imageUrl, 
                        caption: `<p>${caption.replace(/\n/g, '<br/>')}</p>`,
                        provider: 'runware'
                    });
                    continue; // Skip to next caption if successful
                }
                // If we get here, Runware failed or timed out, fall back to DALL-E
            } catch (error) {
                console.error('[Debug] Runware generation failed or timed out:', error.message);
                // Proceed to DALL-E fallback
            }
            
            // Fallback to DALL-E
            try {
                console.log('[Debug] Falling back to DALL-E');
                const dalleResult = await generateWithDallE();
                
                if (dalleResult.success) {
                    console.log('[Debug] Successfully generated image with DALL-E fallback');
                    zineItems.push({ 
                        imageUrl: dalleResult.imageUrl, 
                        caption: `<p>${caption.replace(/\n/g, '<br/>')}</p>`,
                        provider: 'dalle'
                    });
                } else {
                    // Both services failed, use placeholder
                    console.error('[Debug] Both image generation services failed');
                    zineItems.push({ 
                        imageUrl: '/placeholder-error.svg',
                        caption: `<p>Error generating image: Unable to generate image with both services</p><p>${caption}</p>`,
                        provider: 'none' 
                    });
                }
            } catch (finalError) {
                console.error('[Debug] Final fallback error:', finalError);
                zineItems.push({ 
                    imageUrl: '/placeholder-error.svg',
                    caption: `<p>Error generating image: ${finalError.message || 'Unknown error'}</p><p>${caption}</p>`,
                    provider: 'none'
                });
            }
        }

        res.status(200).json({ items: zineItems });

    } catch (error) {
        console.error('Error generating zine content:', error);
        if (error.response) { // Axios-like error structure from OpenAI library
            console.error('OpenAI API Error Status:', error.response.status);
            console.error('OpenAI API Error Data:', error.response.data);
        }
        res.status(500).json({ message: error.message || 'Failed to generate zine content.' });
    }
}
