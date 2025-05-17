import { OpenAI } from 'openai';
import { Runware } from '@runware/sdk-js';

export default {
  async fetch(request, env) {
    // CORS headers - ensure these are properly implemented
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
      'Access-Control-Max-Age': '86400',
    };

    // Handle OPTIONS request (preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204
      });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    try {
      // Parse the incoming request body
      const data = await request.json();
      const { prompt } = data;

      if (!prompt || typeof prompt !== 'string') {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Valid prompt is required' 
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // Initialize the APIs
      const openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });
      
      const runware = new Runware({ 
        apiKey: env.RUNWARE_API_KEY 
      });
      
      // Timeout for image generation in milliseconds (8 seconds)
      const IMAGE_GENERATION_TIMEOUT = 8000;

      console.log(`[ImageGenerator] Generating image for prompt: ${prompt.substring(0, 50)}...`);
      
      // Try to generate with Runware first
      try {
        // Create a promise that resolves after the timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Runware timeout')), IMAGE_GENERATION_TIMEOUT)
        );
        
        // Add mythic style modifiers to the prompt
        const enhancedPrompt = `Mythic zine art style, evocative, cinematic lighting, dramatic scene: ${prompt}`;
        
        // Race between Runware generation and timeout
        const runwarePromise = runware.requestImages([{
          taskType: "imageInference",
          width: 1024,
          height: 1024,
          numberResults: 1,
          outputFormat: "JPEG",
          steps: 28,
          CFGScale: 3.5,
          scheduler: "FlowMatchEulerDiscreteScheduler",
          outputType: ["URL"],
          includeCost: true,
          positivePrompt: enhancedPrompt,
          model: "runware:101@1"
        }]);
        
        const results = await Promise.race([
          runwarePromise,
          timeoutPromise
        ]);
        
        // Check if we got valid results
        if (results && results.length > 0 && results[0].imageURL) {
          console.log('[ImageGenerator] Successfully generated image with Runware');
          return new Response(JSON.stringify({ 
            success: true, 
            imageUrl: results[0].imageURL,
            provider: 'runware'
          }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        } else {
          console.error('[ImageGenerator] Unexpected Runware response structure:', results);
          throw new Error('Unexpected response from Runware');
        }
      } catch (runwareError) {
        // Fallback to DALL-E
        console.error('[ImageGenerator] Runware generation failed or timed out:', runwareError.message);
        console.log('[ImageGenerator] Falling back to DALL-E');
        
        try {
          // Add mythic style modifiers to the prompt
          const enhancedPrompt = `Mythic zine art style, detailed illustration for a visual story: ${prompt}`;
          
          // Call DALL-E API to generate image
          const imageResult = await openai.images.generate({
            model: "dall-e-3",
            prompt: enhancedPrompt,
            n: 1,
            size: "1024x1024", // Square aspect ratio for DALL-E
            quality: "standard",
          });

          if (imageResult.data && imageResult.data[0] && imageResult.data[0].url) {
            console.log('[ImageGenerator] Successfully generated image with DALL-E fallback');
            return new Response(JSON.stringify({ 
              success: true, 
              imageUrl: imageResult.data[0].url,
              provider: 'dalle'
            }), {
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          } else {
            console.error('[ImageGenerator] Unexpected DALL-E response structure');
            throw new Error('Unexpected response from DALL-E');
          }
        } catch (dalleError) {
          console.error('[ImageGenerator] DALL-E Error:', dalleError);
          return new Response(JSON.stringify({ 
            success: false, 
            error: dalleError.message || 'Unknown DALL-E error',
            imageUrl: '/placeholder-error.svg',
            provider: 'none'
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      }
    } catch (error) {
      console.error('[ImageGenerator] Final fallback error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error',
        imageUrl: '/placeholder-error.svg',
        provider: 'none'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  }
};
