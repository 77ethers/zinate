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

      if (!prompt || prompt.trim().length < 10) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Prompt must be at least 10 characters long.' 
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      console.log(`[ZineWorker] Starting zine generation for prompt: "${prompt.substring(0, 30)}..."`);
      
      // Step 1: Generate story plan
      console.log(`[ZineWorker] Calling story planner worker at URL: ${env.STORY_PLANNER_WORKER_URL}`);
      
      // Debug information - return info about the environment variables to help debug
      if (request.url.includes('debug=true')) {
        return new Response(JSON.stringify({
          debug: true,
          storyPlannerUrl: env.STORY_PLANNER_WORKER_URL,
          contentGeneratorUrl: env.CONTENT_GENERATOR_WORKER_URL,
          imageGeneratorUrl: env.IMAGE_GENERATOR_WORKER_URL,
          env: Object.keys(env)
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      let storyPlanResult;
      try {
        // Use fully qualified URL with path
        const storyPlannerURL = 'https://zinate-story-planner.77ethers.workers.dev/';
        
        console.log(`[ZineWorker] Attempting direct fetch to story planner at: ${storyPlannerURL}`);
        
        // Try with specific headers to help ensure proper routing
        const storyPlanResponse = await fetch(storyPlannerURL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'ZinateMainWorker/1.0',
            'X-Worker-Call': 'true'
          },
          body: JSON.stringify({ prompt }),
        });
        
        console.log(`[ZineWorker] Story planner worker response status: ${storyPlanResponse.status}`);
        
        if (!storyPlanResponse.ok) {
          const errorText = await storyPlanResponse.text();
          throw new Error(`Story planner worker returned status ${storyPlanResponse.status}: ${errorText}`);
        }

        storyPlanResult = await storyPlanResponse.json();
      } catch (error) {
        console.error('[ZineWorker] Error communicating with story planner worker:', error);
        return new Response(JSON.stringify({
          success: false,
          error: `Error communicating with story planner worker: ${error.message}`,
          stage: 'story-planning'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      if (!storyPlanResult.success) {
        return new Response(JSON.stringify({
          success: false,
          error: `Story planning failed: ${storyPlanResult.error}`,
          stage: 'story-planning'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      const storyPlan = storyPlanResult.storyPlan;
      console.log(`[ZineWorker] Story plan created: "${storyPlan.title}"`);
      
      // Step 2: Generate content based on story plan
      console.log(`[ZineWorker] Calling content generator worker at URL: ${env.CONTENT_GENERATOR_WORKER_URL}`);
      
      let contentResult;
      try {
        // Use hardcoded URL for the content generator worker with path
        const contentGeneratorURL = 'https://zinate-content-generator.77ethers.workers.dev/';
        
        console.log(`[ZineWorker] Attempting direct fetch to content generator at: ${contentGeneratorURL}`);
        
        const contentResponse = await fetch(contentGeneratorURL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'ZinateMainWorker/1.0',
            'X-Worker-Call': 'true'
          },
          body: JSON.stringify({ storyPlan }),
        });
        
        console.log(`[ZineWorker] Content generator worker response status: ${contentResponse.status}`);
        
        if (!contentResponse.ok) {
          const errorText = await contentResponse.text();
          throw new Error(`Content generator worker returned status ${contentResponse.status}: ${errorText}`);
        }

        contentResult = await contentResponse.json();
      } catch (error) {
        console.error('[ZineWorker] Error communicating with content generator worker:', error);
        return new Response(JSON.stringify({
          success: false,
          error: `Error communicating with content generator worker: ${error.message}`,
          stage: 'content-generation',
          storyPlan // Include the story plan in case of partial failure
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      if (!contentResult.success) {
        return new Response(JSON.stringify({
          success: false,
          error: `Content generation failed: ${contentResult.error}`,
          stage: 'content-generation',
          storyPlan // Include the story plan in case of partial failure
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      const contentPages = Array.isArray(contentResult.content) ? 
                         contentResult.content : 
                         contentResult.content.pages || contentResult.content;
      
      console.log(`[ZineWorker] Generated content for ${contentPages.length} pages`);
      
      // Step 3: Generate images for each page
      const zinePages = [];
      
      for (let i = 0; i < contentPages.length; i++) {
        const page = contentPages[i];
        console.log(`[ZineWorker] Processing page ${i+1}/${contentPages.length}`);
        
        try {
          // Generate image
          console.log(`[ZineWorker] Calling image generator worker at URL: ${env.IMAGE_GENERATOR_WORKER_URL} for page ${i+1}`);
          
          // Generate image with better error handling and headers
          const imageGeneratorURL = 'https://zinate-image-generator.77ethers.workers.dev/';
          
          console.log(`[ZineWorker] Attempting direct fetch to image generator at: ${imageGeneratorURL} for page ${i+1}`);
          
          const imageResponse = await fetch(imageGeneratorURL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'ZinateMainWorker/1.0',
              'X-Worker-Call': 'true'
            },
            body: JSON.stringify({ prompt: page.imagePrompt }),
          });
          
          console.log(`[ZineWorker] Image generator worker response status for page ${i+1}: ${imageResponse.status}`);
          
          if (!imageResponse.ok) {
            const errorText = await imageResponse.text();
            console.error(`[ZineWorker] Image generator worker error for page ${i+1}: ${errorText}`);
            throw new Error(`Image generator worker returned status ${imageResponse.status} for page ${i+1}`);
          }
          
          const imageResult = await imageResponse.json();
          
          // Add the generated image and content to the zine pages
          zinePages.push({
            pageNumber: page.pageNumber || i + 1,
            text: page.text,
            imageUrl: imageResult.imageUrl || '/placeholder-error.svg',
            imagePrompt: page.imagePrompt,
            provider: imageResult.provider || 'none',
            error: imageResult.success ? null : imageResult.error
          });
        } catch (pageError) {
          console.error(`[ZineWorker] Error processing page ${i+1}:`, pageError);
          // Add error page but continue processing other pages
          zinePages.push({
            pageNumber: page.pageNumber || i + 1,
            text: page.text,
            imageUrl: '/placeholder-error.svg',
            imagePrompt: page.imagePrompt,
            provider: 'none',
            error: pageError.message || 'Error generating image'
          });
        }
      }
      
      console.log('[ZineWorker] Completed zine generation');
      
      // Format the zine pages into the expected format for the frontend
      const zineItems = zinePages.map(page => ({
        imageUrl: page.imageUrl,
        caption: `<p>${page.text.replace(/\n/g, '<br/>')}</p>`,
        provider: page.provider,
        // Include additional metadata
        title: storyPlan.title,
        pageNumber: page.pageNumber,
        error: page.error || null
      }));
      
      // Return the complete zine data with success flag
      return new Response(JSON.stringify({ 
        success: true,
        items: zineItems,
        title: storyPlan.title,
        description: storyPlan.description,
        prompt: prompt
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('[ZineWorker] Error in zine generation process:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred during zine generation',
        stage: 'unknown'
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
