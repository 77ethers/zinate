/**
 * Client Worker Adapter
 * 
 * This adapter allows the frontend to communicate directly with Cloudflare Workers
 * without going through the Next.js API routes.
 */

class ClientWorkerAdapter {
  constructor() {
    // Initialize worker URLs from environment variables
    this.urls = {
      storyPlanner: process.env.NEXT_PUBLIC_STORY_PLANNER_WORKER_URL || 'https://zinate-story-planner.77ethers.workers.dev',
      contentGenerator: process.env.NEXT_PUBLIC_CONTENT_GENERATOR_WORKER_URL || 'https://zinate-content-generator.77ethers.workers.dev',
      imageGenerator: process.env.NEXT_PUBLIC_IMAGE_GENERATOR_WORKER_URL || 'https://zinate-image-generator.77ethers.workers.dev',
      zine: process.env.NEXT_PUBLIC_ZINE_WORKER_URL || 'https://zinate-main.77ethers.workers.dev',
      shareZine: process.env.NEXT_PUBLIC_SHARE_ZINE_WORKER_URL || 'https://zinate-share.77ethers.workers.dev'
    };
    
    // Flag to determine if we should use worker orchestration or client orchestration
    this.useDirectWorker = process.env.NEXT_PUBLIC_USE_DIRECT_WORKER === 'true';
  }

  /**
   * Generate a complete zine directly using the zine worker
   * @param {string} prompt - User's zine prompt
   * @param {Function} progressCallback - Optional callback for progress updates
   * @returns {Promise<Object>} - The generated zine data
   */
  async generateZine(prompt, progressCallback = null) {
    try {
      console.log(`[ClientWorkerAdapter] generateZine called with prompt: ${prompt.substring(0, 30)}...`);
      console.log(`[ClientWorkerAdapter] useDirectWorker set to: ${this.useDirectWorker}`);
      
      // Start progress tracking if callback provided
      if (progressCallback) {
        progressCallback({ step: 'planning', status: 'Processing your request...' });
      }
      
      // If direct worker communication is enabled, use the zine worker
      // Otherwise, orchestrate the process client-side
      if (!this.useDirectWorker) {
        // Call the main zine worker to handle the entire process
        const response = await fetch(this.urls.zine, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate zine');
        }
        
        const result = await response.json();
        
        // Complete progress if callback provided
        if (progressCallback) {
          progressCallback({ step: 'complete', status: 'Zine generation complete!' });
        }
        
        return result;
      } else {
        // Use client-side orchestration instead of relying on the main zine worker
        return await this.orchestrateZineGeneration(prompt, progressCallback);
      }
    } catch (error) {
      console.error('[ClientWorkerAdapter] Error generating zine:', error);
      
      // Report error in progress if callback provided
      if (progressCallback) {
        progressCallback({ step: 'error', status: error.message || 'Error generating zine' });
      }
      
      return { 
        success: false, 
        error: error.message || 'Error connecting to zine worker' 
      };
    }
  }
  
  /**
   * Orchestrate the entire zine generation process on the client side
   * by calling each worker in sequence
   * @param {string} prompt - User's zine prompt
   * @param {Function} progressCallback - Optional callback for progress updates
   * @returns {Promise<Object>} - The generated zine data
   */
  async orchestrateZineGeneration(prompt, progressCallback = null) {
    try {
      console.log('[ClientWorkerAdapter] Starting client-side orchestration with worker URLs:', this.urls);
      
      // Step 1: Generate story plan
      if (progressCallback) {
        progressCallback({ step: 'story-planning', status: 'Creating your story...' });
      }
      
      console.log('[ClientWorkerAdapter] Generating story plan...');
      console.log(`[ClientWorkerAdapter] Calling story planner at: ${this.urls.storyPlanner}`);
      const storyPlanResult = await this.generateStory(prompt);
      console.log('[ClientWorkerAdapter] Story plan result:', storyPlanResult);
      
      if (!storyPlanResult.success) {
        throw new Error(`Story planning failed: ${storyPlanResult.error}`);
      }
      
      const storyPlan = storyPlanResult.storyPlan;
      console.log(`[ClientWorkerAdapter] Story plan created: "${storyPlan.title}"`);
      
      // Step 2: Generate content based on story plan
      if (progressCallback) {
        progressCallback({ step: 'content-generation', status: 'Writing your zine pages...' });
      }
      
      console.log('[ClientWorkerAdapter] Generating content...');
      console.log(`[ClientWorkerAdapter] Calling content generator at: ${this.urls.contentGenerator}`);
      const contentResult = await this.generateContent(storyPlan);
      console.log('[ClientWorkerAdapter] Content generation result:', contentResult);
      
      if (!contentResult.success) {
        throw new Error(`Content generation failed: ${contentResult.error}`);
      }
      
      // Log the exact structure of the content response to diagnose the issue
      console.log('[ClientWorkerAdapter] Content structure:', JSON.stringify(contentResult, null, 2));
      
      // More carefully extract pages from the content result
      let contentPages = [];
      
      if (Array.isArray(contentResult.content)) {
        contentPages = contentResult.content;
      } else if (contentResult.content && typeof contentResult.content === 'object') {
        if (Array.isArray(contentResult.content.pages)) {
          contentPages = contentResult.content.pages;
        } else if (contentResult.content.pages) {
          // Try to parse if it's a string representation of an array
          try {
            const parsedPages = JSON.parse(contentResult.content.pages);
            if (Array.isArray(parsedPages)) {
              contentPages = parsedPages;
            }
          } catch (e) {
            console.error('[ClientWorkerAdapter] Failed to parse content.pages:', e);
          }
        }
      }
      
      // If we still don't have pages, try to adapt different content structures
      if (contentPages.length === 0) {
        // Check if content itself has page-like properties
        if (contentResult.content && typeof contentResult.content === 'object' && contentResult.content.text) {
          // Single page content
          contentPages = [contentResult.content];
        } else if (contentResult.pages && Array.isArray(contentResult.pages)) {
          // Pages directly on the result object
          contentPages = contentResult.pages;
        }
      }
      
      console.log(`[ClientWorkerAdapter] Extracted ${contentPages.length} pages from content result`);
      console.log('[ClientWorkerAdapter] First page sample:', contentPages.length > 0 ? JSON.stringify(contentPages[0], null, 2) : 'No pages');
      
      // Step 3: Generate images for each page
      const zinePages = [];
      
      for (let i = 0; i < contentPages.length; i++) {
        const page = contentPages[i];
        
        if (progressCallback) {
          progressCallback({ 
            step: 'image-generation', 
            status: `Creating illustration ${i+1} of ${contentPages.length}...`,
            progress: (i / contentPages.length) * 100
          });
        }
        
        console.log(`[ClientWorkerAdapter] Processing page ${i+1}/${contentPages.length}`);
        
        try {
          // Generate image
          console.log(`[ClientWorkerAdapter] Generating image for page ${i+1} with prompt: ${page.imagePrompt.substring(0, 30)}...`);
          console.log(`[ClientWorkerAdapter] Calling image generator at: ${this.urls.imageGenerator}`);
          const imageResult = await this.generateImage(page.imagePrompt);
          console.log(`[ClientWorkerAdapter] Image generation result for page ${i+1}:`, {
            success: imageResult.success,
            provider: imageResult.provider,
            imageUrl: imageResult.imageUrl ? `${imageResult.imageUrl.substring(0, 50)}...` : 'none'
          });
          
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
          console.error(`[ClientWorkerAdapter] Error processing page ${i+1}:`, pageError);
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
      
      console.log('[ClientWorkerAdapter] Completed zine generation');
      
      // Format the zine pages into the expected format for the frontend
      const zineItems = zinePages.map(page => {
        // Process text to replace newlines with <br/> tags
        const processedText = page.text.replace(/\n/g, '<br/>');
        
        return {
          imageUrl: page.imageUrl,
          caption: `<p>${processedText}</p>`,
          provider: page.provider,
          // Include additional metadata
          title: storyPlan.title,
          pageNumber: page.pageNumber,
          error: page.error || null
        };
      });
      
      // Complete progress if callback provided
      if (progressCallback) {
        progressCallback({ step: 'complete', status: 'Zine generation complete!' });
      }
      
      // Return the complete zine data in the same format as the zine worker would
      const finalResult = {
        success: true,
        items: zineItems,
        title: storyPlan.title,
        description: storyPlan.description,
        prompt: prompt
      };
      
      console.log('[ClientWorkerAdapter] Returning final zine data:', {
        success: finalResult.success,
        itemCount: finalResult.items.length,
        title: finalResult.title,
        description: finalResult.description ? finalResult.description.substring(0, 50) + '...' : 'none'
      });
      
      return finalResult;
    } catch (error) {
      console.error('[ClientWorkerAdapter] Error in client-side orchestration:', error);
      
      // Report error in progress if callback provided
      if (progressCallback) {
        progressCallback({ step: 'error', status: error.message || 'Error during zine generation' });
      }
      
      const errorResult = {
        success: false, 
        error: error.message || 'Error orchestrating zine generation'
      };
      
      console.log('[ClientWorkerAdapter] Error in orchestration, returning:', errorResult);
      
      return errorResult;
    }
  }

  /**
   * Generate a story plan using the story planner worker
   * @param {string} prompt - User's story prompt
   * @returns {Promise<Object>} - The story plan
   */
  async generateStory(prompt) {
    try {
      const response = await fetch(this.urls.storyPlanner, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate story plan');
      }
      
      return await response.json();
    } catch (error) {
      console.error('[ClientWorkerAdapter] Error generating story plan:', error);
      return { 
        success: false, 
        error: error.message || 'Error connecting to story planner worker' 
      };
    }
  }

  /**
   * Generate content using the content generator worker
   * @param {Object} storyPlan - The story plan
   * @returns {Promise<Object>} - The content
   */
  async generateContent(storyPlan) {
    try {
      const response = await fetch(this.urls.contentGenerator, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storyPlan }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate content');
      }
      
      return await response.json();
    } catch (error) {
      console.error('[ClientWorkerAdapter] Error generating content:', error);
      return { 
        success: false, 
        error: error.message || 'Error connecting to content generator worker' 
      };
    }
  }

  /**
   * Generate an image using the image generator worker
   * @param {string} prompt - Image prompt
   * @returns {Promise<Object>} - The image data
   */
  async generateImage(prompt) {
    try {
      const response = await fetch(this.urls.imageGenerator, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }
      
      return await response.json();
    } catch (error) {
      console.error('[ClientWorkerAdapter] Error generating image:', error);
      return { 
        success: false, 
        error: error.message || 'Error connecting to image generator worker',
        imageUrl: '/placeholder-error.svg',
        provider: 'none'
      };
    }
  }

  /**
   * Share a zine using the share zine worker
   * @param {Object} zineData - The zine data to share
   * @returns {Promise<Object>} - The share result with ID and URL
   */
  async shareZine(zineData) {
    try {
      const response = await fetch(`${this.urls.shareZine}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zineData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to share zine');
      }
      
      return await response.json();
    } catch (error) {
      console.error('[ClientWorkerAdapter] Error sharing zine:', error);
      return { 
        success: false, 
        error: error.message || 'Error connecting to share zine worker' 
      };
    }
  }

  /**
   * Get a shared zine using the share zine worker
   * @param {string} zineId - The ID of the shared zine
   * @returns {Promise<Object>} - The shared zine data
   */
  async getSharedZine(zineId) {
    try {
      const response = await fetch(`${this.urls.shareZine}/share/${zineId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to retrieve shared zine');
      }
      
      return await response.json();
    } catch (error) {
      console.error('[ClientWorkerAdapter] Error retrieving shared zine:', error);
      return { 
        success: false, 
        error: error.message || 'Error connecting to share zine worker' 
      };
    }
  }
}



// Export the class as default
export default ClientWorkerAdapter;
