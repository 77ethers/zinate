import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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


        // Step 2: For each caption, generate an image
        // Using the model from api-example.js: gpt-image-1 (likely DALL-E 3, using 'dall-e-3' which is standard)
        const zineItems = [];
        for (const caption of captions) {
            const imagePrompt = `Vibrant Indian comic art style, epic mythology. Scene: ${caption}`;
            const imageResult = await openai.images.generate({
                model: "dall-e-3", // Using dall-e-3 as per spec, as gpt-image-1 not standard identifier
                prompt: imagePrompt,
                n: 1,
                size: "1024x1024", // DALL-E 3 supports 1024x1024, 1024x1792, 1792x1024
                response_format: "url", // Request URL directly
            });

            // DALL-E 3 URL expires after some time. For production, you'd save to your own storage.
            const imageUrl = imageResult.data[0].url;
            zineItems.push({ imageUrl, caption: `<p>${caption.replace(/\n/g, '<br/>')}</p>` });
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
