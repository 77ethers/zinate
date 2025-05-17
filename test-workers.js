// Simple test script to check Cloudflare Worker connectivity
require('dotenv').config();
const fetch = require('node-fetch');

// Worker URLs from .env
const workerURLs = {
  storyPlanner: process.env.NEXT_PUBLIC_STORY_PLANNER_WORKER_URL,
  contentGenerator: process.env.NEXT_PUBLIC_CONTENT_GENERATOR_WORKER_URL, 
  imageGenerator: process.env.NEXT_PUBLIC_IMAGE_GENERATOR_WORKER_URL,
  zine: process.env.NEXT_PUBLIC_ZINE_WORKER_URL
};

console.log('Testing Cloudflare Worker connectivity...');
console.log('Worker URLs:', workerURLs);

async function testWorkers() {
  // Test story planner worker
  try {
    console.log('\n🔍 Testing Story Planner Worker...');
    const storyResponse = await fetch(workerURLs.storyPlanner, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'A short test prompt for workers' })
    });
    
    const storyData = await storyResponse.json();
    console.log('✅ Story Planner Response:', 
      storyData.success ? 'Success' : 'Failed',
      storyData.storyPlan ? `(Generated title: "${storyData.storyPlan.title}")` : ''
    );
  } catch (error) {
    console.error('❌ Story Planner Error:', error.message);
  }
  
  // Test the main zine worker which coordinates everything
  try {
    console.log('\n🔍 Testing Main Zine Worker...');
    console.log('(This may take longer as it coordinates with other workers)');
    const zineResponse = await fetch(workerURLs.zine, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'A short test prompt for the zine worker' })
    });
    
    const zineData = await zineResponse.json();
    console.log('Main Zine Worker Response:', zineData);
    
    if (zineData.success) {
      console.log('✅ Main Zine Worker: Success');
    } else {
      console.log('❌ Main Zine Worker Error:', zineData.error);
      console.log('Stage:', zineData.stage || 'unknown');
    }
  } catch (error) {
    console.error('❌ Main Zine Worker Error:', error.message);
  }
  
  console.log('\n📋 Worker Connectivity Test Complete');
}

testWorkers();
