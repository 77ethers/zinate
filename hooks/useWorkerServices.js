import { useState } from 'react';
import ClientWorkerAdapter from '../services/client-worker-adapter';

/**
 * Hook for accessing Cloudflare Worker services directly from the client
 * This allows bypassing the Next.js API when direct worker communication is enabled
 */
export default function useWorkerServices() {
  // Create adapter instance
  const [adapter] = useState(() => new ClientWorkerAdapter());
  
  // Check if direct worker communication is enabled
  const useDirectWorker = process.env.NEXT_PUBLIC_USE_DIRECT_WORKER === 'true';
  
  // State for tracking progress
  const [generationProgress, setGenerationProgress] = useState({
    isGenerating: false,
    step: null,
    status: null,
    error: null,
  });
  
  /**
   * Generate a complete zine
   * @param {string} prompt - User's zine prompt
   * @returns {Promise<Object>} - Generated zine or error
   */
  const generateZine = async (prompt) => {
    if (!useDirectWorker) {
      // When direct worker is disabled, use the Next.js API route
      return fetchFromApi(prompt);
    }
    
    try {
      setGenerationProgress({
        isGenerating: true,
        step: 'planning',
        status: 'Creating your mythic story...',
        error: null,
      });
      
      // Progress tracking callback
      const progressCallback = (progress) => {
        // Map client-side orchestration steps to UI steps if needed
        let uiStep = progress.step;
        
        // Map step names to match what the UI expects
        if (progress.step === 'story-planning') uiStep = 'planning';
        if (progress.step === 'content-generation') uiStep = 'content';
        if (progress.step === 'image-generation') uiStep = 'generating';
        
        const statusMap = {
          'story-planning': 'Creating your mythic story...',
          'content-generation': 'Creating vivid scenes and descriptions...',
          'image-generation': 'Bringing your story to life with images...'
        };
        
        // Use the mapped status if available, otherwise use the provided status
        const uiStatus = statusMap[progress.step] || progress.status;
        
        setGenerationProgress(prev => ({
          ...prev,
          step: uiStep,
          status: uiStatus,
          isGenerating: progress.step !== 'complete' && progress.step !== 'error',
          error: progress.step === 'error' ? progress.status : null,
        }));
      };
      
      // Call worker adapter with progress tracking
      const result = await adapter.generateZine(prompt, progressCallback);
      
      // Update final state based on result
      setGenerationProgress(prev => ({
        ...prev,
        isGenerating: false,
        step: result.success ? 'complete' : 'error',
        status: result.success ? 'Zine generation complete!' : 'Error generating zine',
        error: result.success ? null : (result.error || 'Unknown error'),
      }));
      
      return result;
    } catch (error) {
      console.error('[useWorkerServices] Error generating zine:', error);
      
      setGenerationProgress({
        isGenerating: false,
        step: 'error',
        status: 'Failed to generate zine',
        error: error.message || 'Unknown error occurred',
      });
      
      return { 
        success: false, 
        error: error.message || 'Failed to generate zine'
      };
    }
  };
  
  /**
   * Fetch zine from the Next.js API route (used when direct worker is disabled)
   * @param {string} prompt - User's zine prompt
   * @returns {Promise<Object>} - Generated zine or error
   */
  const fetchFromApi = async (prompt) => {
    try {
      setGenerationProgress({
        isGenerating: true,
        step: 'api',
        status: 'Communicating with API...',
        error: null,
      });
      
      // Connect to the Server-Sent Events endpoint for progress
      const progressId = prompt.trim();
      const evtSource = new EventSource(`/api/progress?id=${encodeURIComponent(progressId)}`);
      
      evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.step) {
          // Map API progress steps to user-friendly messages
          const statusMessages = {
            planning: 'Creating your mythic story...',
            content: 'Crafting the narrative...',
            generating: 'Conjuring mythic images...',
            assembling: 'Assembling your zine...',
          };
          
          setGenerationProgress(prev => ({
            ...prev,
            step: data.step,
            status: statusMessages[data.step] || 'Processing...',
          }));
        }
      };
      
      evtSource.onerror = () => {
        evtSource.close();
      };
      
      console.log(`[Debug] Calling generateZine with prompt: ${prompt.substring(0, 30)}...`);
      
      // Use our worker services to generate the zine
      // This will automatically use Cloudflare Workers directly if enabled,
      // or fall back to the Next.js API
      const data = await generateZine(prompt);
      
      console.log('[Debug] generateZine response:', data);
      
      // Call the Next.js API endpoint
      const response = await fetch(`/api/generate?prompt=${encodeURIComponent(prompt)}`);
      evtSource.close(); // Close the event source when the main request completes
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate zine');
      }
      
      const result = await response.json();
      
      setGenerationProgress({
        isGenerating: false,
        step: 'complete',
        status: 'Zine generation complete!',
        error: null,
      });
      
      return result;
    } catch (error) {
      console.error('[useWorkerServices] API fetch error:', error);
      
      setGenerationProgress({
        isGenerating: false,
        step: 'error',
        status: 'Failed to generate zine',
        error: error.message || 'Unknown error occurred',
      });
      
      return { 
        success: false, 
        error: error.message || 'Failed to generate zine from API'
      };
    }
  };

  return {
    generateZine,
    generationProgress,
    useDirectWorker, // Export this flag so UI can show appropriate messaging
    isGenerating: generationProgress.isGenerating,
  };
}
