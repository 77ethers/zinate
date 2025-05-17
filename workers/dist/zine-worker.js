export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      const storyPlanResponse = await fetch(env.STORY_PLANNER_WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const storyPlanResult = await storyPlanResponse.json();
      
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
      const contentResponse = await fetch(env.CONTENT_GENERATOR_WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storyPlan }),
      });

      const contentResult = await contentResponse.json();
      
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
          const imageResponse = await fetch(env.IMAGE_GENERATOR_WORKER_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: page.imagePrompt }),
          });
          
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
      
      // Return the complete zine data
      return new Response(JSON.stringify({ 
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
