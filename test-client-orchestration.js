// Test script for client-side orchestration
require('dotenv').config();
const ClientWorkerAdapter = require('./services/client-worker-adapter').default;

// Create a new instance of the client adapter
const clientAdapter = new ClientWorkerAdapter();

console.log('\n🧪 Testing Client-Side Orchestration for Zinate');
console.log(`Worker URLs being used:\n- Story Planner: ${clientAdapter.urls.storyPlanner}\n- Content Generator: ${clientAdapter.urls.contentGenerator}\n- Image Generator: ${clientAdapter.urls.imageGenerator}`);
console.log(`Client-side orchestration enabled: ${clientAdapter.useDirectWorker ? 'Yes' : 'No'}\n`);

// Simple progress callback function
function progressCallback(progress) {
  const status = progress.status || 'Working...';
  const step = progress.step || 'unknown';
  const progressPercent = progress.progress ? `(${Math.round(progress.progress)}%)` : '';
  console.log(`${getStepEmoji(step)} Step: ${step} ${progressPercent} - ${status}`);
}

// Helper function to get emoji for current step
function getStepEmoji(step) {
  switch(step) {
    case 'planning': return '🧠';
    case 'story-planning': return '📝';
    case 'content-generation': return '✍️';
    case 'image-generation': return '🎨';
    case 'complete': return '✅';
    case 'error': return '❌';
    default: return '⏳';
  }
}

async function runTest() {
  const testPrompt = 'A short children\'s story about a friendly dragon who learns to bake cookies';
  
  console.log(`Test prompt: "${testPrompt}"\n`);
  console.log('Starting zine generation process with client-side orchestration...\n');
  
  try {
    // Use the orchestrateZineGeneration method directly to bypass the main zine worker
    const result = await clientAdapter.orchestrateZineGeneration(testPrompt, progressCallback);
    
    if (result.success) {
      console.log('\n✅ Zine generation successful!');
      console.log(`Title: ${result.title}`);
      console.log(`Description: ${result.description}`);
      console.log(`Number of pages: ${result.items.length}`);
      
      // Print a sample of the first page
      if (result.items.length > 0) {
        const firstPage = result.items[0];
        console.log('\nSample (First Page):')
        console.log(`- Image URL: ${firstPage.imageUrl ? firstPage.imageUrl.substring(0, 60) + '...' : 'None'}`);
        console.log(`- Provider: ${firstPage.provider}`);
        console.log(`- Caption: ${firstPage.caption.replace(/<[^>]*>/g, '').substring(0, 100)}...`);
      }
    } else {
      console.log(`\n❌ Zine generation failed: ${result.error}`);
    }
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
  }
}

// Run the test
runTest();
