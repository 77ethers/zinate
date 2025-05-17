import WorkerAdapter from './worker-adapter';

class ZineService {
  constructor() {
    this.workerAdapter = new WorkerAdapter();
  }

  async generateZine(prompt, progressTracker = null) {
    try {
      // Helper function to update progress if tracker is provided
      const updateProgress = (step) => {
        if (progressTracker && typeof progressTracker === 'function') {
          progressTracker(step);
        }
      };
      
      // Initial progress update
      updateProgress('planning');
      
      // Step 1: Generate a cohesive story plan based on the user prompt
      console.log('[ZineService] Starting story planning process');
      const storyResult = await this.workerAdapter.generateStory(prompt);
      
      if (!storyResult.success) {
        return {
          success: false,
          error: `Story planning failed: ${storyResult.error}`,
          stage: 'story-planning'
        };
      }
      
      const storyPlan = storyResult.storyPlan;
      console.log(`[ZineService] Story plan created: "${storyPlan.title}"`);
      
      // Update progress to content generation step
      updateProgress('content');
      
      // Step 2: Generate content and image prompts based on the story plan
      console.log('[ZineService] Generating content and image prompts');
      const contentResult = await this.workerAdapter.generateContent(storyPlan);
      
      if (!contentResult.success) {
        return {
          success: false,
          error: `Content generation failed: ${contentResult.error}`,
          stage: 'content-generation',
          storyPlan // Include the story plan in case of partial failure
        };
      }
      
      const contentPages = Array.isArray(contentResult.content) ? 
                          contentResult.content : 
                          contentResult.content.pages || contentResult.content;
      
      console.log(`[ZineService] Generated content for ${contentPages.length} pages`);
      
      // Update progress to image generation step
      updateProgress('generating');
      
      // Step 3: Generate images based on image prompts
      console.log('[ZineService] Generating images for all pages');
      const zinePages = [];
      
      for (let i = 0; i < contentPages.length; i++) {
        const page = contentPages[i];
        console.log(`[ZineService] Processing page ${i+1}/${contentPages.length}`);
        
        try {
          // Generate image using the image prompt
          const imageResult = await this.workerAdapter.generateImage(page.imagePrompt);
          
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
          console.error(`[ZineService] Error processing page ${i+1}:`, pageError);
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
      
      // Update progress to final assembly step
      updateProgress('assembling');
      
      console.log('[ZineService] Completed zine generation');
      
      // Return the complete zine data
      return {
        success: true,
        zine: {
          title: storyPlan.title,
          description: storyPlan.description,
          pages: zinePages,
          metadata: {
            prompt,
            generatedAt: new Date().toISOString(),
            storyPlan
          }
        }
      };
      
    } catch (error) {
      console.error('[ZineService] Error in zine generation process:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred during zine generation',
        stage: 'unknown'
      };
    }
  }
}

export default ZineService;
