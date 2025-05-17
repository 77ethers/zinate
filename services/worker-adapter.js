/**
 * Worker Adapter Service
 * 
 * This adapter allows the frontend to communicate with Cloudflare Workers
 * and provides fallback to local services when workers are not available.
 */

import StoryPlannerService from './story-planner';
import ContentImageGeneratorService from './content-image-generator';
import ImageGeneratorService from './image-generator';

class WorkerAdapter {
  constructor() {
    // Initialize base worker URLs from environment variables
    this.useWorkers = true; // Set to false to use local services
    
    // Worker URLs (these will be replaced with actual URLs after deployment)
    this.urls = {
      storyPlanner: process.env.NEXT_PUBLIC_STORY_PLANNER_WORKER_URL || 'https://story-planner.zinate.workers.dev',
      contentGenerator: process.env.NEXT_PUBLIC_CONTENT_GENERATOR_WORKER_URL || 'https://content-generator.zinate.workers.dev',
      imageGenerator: process.env.NEXT_PUBLIC_IMAGE_GENERATOR_WORKER_URL || 'https://image-generator.zinate.workers.dev',
      zine: process.env.NEXT_PUBLIC_ZINE_WORKER_URL || 'https://api.zinate.workers.dev'
    };
    
    // Initialize local services as fallback
    this.localServices = {
      storyPlanner: new StoryPlannerService(),
      contentGenerator: new ContentImageGeneratorService(),
      imageGenerator: new ImageGeneratorService()
    };
  }

  /**
   * Generate a complete zine using the zine worker
   * @param {string} prompt - User's zine prompt
   * @param {Function} progressTracker - Callback for tracking progress
   * @returns {Promise<Object>} - The generated zine data
   */
  async generateZine(prompt, progressTracker = null) {
    try {
      if (!this.useWorkers) {
        // Use local ZineService (should be imported separately if needed)
        throw new Error('Local ZineService not implemented in this adapter');
      }
      
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
      
      return await response.json();
    } catch (error) {
      console.error('[WorkerAdapter] Error generating zine:', error);
      return { 
        success: false, 
        error: error.message || 'Error connecting to zine worker' 
      };
    }
  }

  /**
   * Generate a story plan using the story planner worker
   * @param {string} prompt - User's story prompt
   * @returns {Promise<Object>} - The story plan
   */
  async generateStory(prompt) {
    try {
      if (!this.useWorkers) {
        return await this.localServices.storyPlanner.generateStory(prompt);
      }
      
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
      console.error('[WorkerAdapter] Error generating story plan:', error);
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
      if (!this.useWorkers) {
        return await this.localServices.contentGenerator.generateContent(storyPlan);
      }
      
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
      console.error('[WorkerAdapter] Error generating content:', error);
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
      if (!this.useWorkers) {
        return await this.localServices.imageGenerator.generateImage(prompt);
      }
      
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
      console.error('[WorkerAdapter] Error generating image:', error);
      return { 
        success: false, 
        error: error.message || 'Error connecting to image generator worker', 
        imageUrl: '/placeholder-error.svg',
        provider: 'none'
      };
    }
  }
}

export default WorkerAdapter;
