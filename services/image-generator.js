import { Runware } from '@runware/sdk-js';
import OpenAI from 'openai';

class ImageGeneratorService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.runware = new Runware({ 
      apiKey: process.env.RUNWARE_API_KEY 
    });
    
    // Timeout for image generation in milliseconds (8 seconds)
    this.IMAGE_GENERATION_TIMEOUT = 8000;
  }

  async generateImage(prompt) {
    console.log(`[ImageGenerator] Generating image for prompt: ${prompt.substring(0, 50)}...`);
    
    // Try to generate with Runware first, with a timeout
    try {
      // Create a promise that resolves after the timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Runware timeout')), this.IMAGE_GENERATION_TIMEOUT)
      );
      
      // Race between Runware generation and timeout
      const runwareResult = await Promise.race([
        this.generateWithRunware(prompt),
        timeoutPromise
      ]);
      
      if (runwareResult.success) {
        console.log('[ImageGenerator] Successfully generated image with Runware');
        return { 
          success: true, 
          imageUrl: runwareResult.imageUrl, 
          provider: 'runware'
        };
      }
      // If we get here, Runware failed or timed out, fall back to DALL-E
    } catch (error) {
      console.error('[ImageGenerator] Runware generation failed or timed out:', error.message);
      // Proceed to DALL-E fallback
    }
    
    // Fallback to DALL-E
    try {
      console.log('[ImageGenerator] Falling back to DALL-E');
      const dalleResult = await this.generateWithDallE(prompt);
      
      if (dalleResult.success) {
        console.log('[ImageGenerator] Successfully generated image with DALL-E fallback');
        return { 
          success: true, 
          imageUrl: dalleResult.imageUrl, 
          provider: 'dalle'
        };
      } else {
        // Both services failed, return error
        console.error('[ImageGenerator] Both image generation services failed');
        return { 
          success: false, 
          error: 'Unable to generate image with both services',
          imageUrl: '/placeholder-error.svg',
          provider: 'none' 
        };
      }
    } catch (finalError) {
      console.error('[ImageGenerator] Final fallback error:', finalError);
      return { 
        success: false, 
        error: finalError.message || 'Unknown error',
        imageUrl: '/placeholder-error.svg',
        provider: 'none'
      };
    }
  }

  async generateWithRunware(prompt) {
    try {
      // Add mythic style modifiers to the prompt
      const enhancedPrompt = `Mythic zine art style, evocative, cinematic lighting, dramatic scene: ${prompt}`;
      
      // Call Runware API to generate image with correct configuration
      // Using the requestImages method as per the documentation
      const results = await this.runware.requestImages({
        taskType: "imageInference",
        width: 1024,
        height: 1024,
        numberResults: 1,
        outputFormat: "JPEG",
        steps: 28,
        CFGScale: 3.5,
        scheduler: "FlowMatchEulerDiscreteScheduler",
        outputType: "URL",
        includeCost: true,
        positivePrompt: enhancedPrompt,
        model: "runware:101@1"
      });

      // Check if we got valid results
      if (results && results.length > 0 && results[0].imageURL) {
        return { success: true, imageUrl: results[0].imageURL };
      } else {
        console.error('[ImageGenerator] Unexpected Runware response structure:', results);
        return { success: false, error: 'Unexpected response from Runware' };
      }
    } catch (error) {
      console.error('[ImageGenerator] Runware error:', error);
      return { success: false, error: error.message || 'Unknown Runware error' };
    }
  }

  async generateWithDallE(prompt) {
    try {
      // Add mythic style modifiers to the prompt
      const enhancedPrompt = `Mythic zine art style, detailed illustration for a visual story: ${prompt}`;
      
      // Call DALL-E API to generate image
      const imageResult = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024", // Square aspect ratio for DALL-E
        quality: "standard",
      });

      if (imageResult.data && imageResult.data[0] && imageResult.data[0].url) {
        return { 
          success: true, 
          imageUrl: imageResult.data[0].url,
          provider: 'dalle' 
        };
      } else {
        console.error('[ImageGenerator] Unexpected DALL-E response structure');
        return { success: false, error: 'Unexpected response from DALL-E' };
      }
    } catch (error) {
      console.error('[ImageGenerator] DALL-E Error:', error);
      return { success: false, error: error.message || 'Unknown DALL-E error' };
    }
  }
}

export default ImageGeneratorService;
