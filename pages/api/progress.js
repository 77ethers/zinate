// This endpoint implements Server-Sent Events (SSE) to provide progress updates
// during the zine creation process

export default function handler(req, res) {
  const { id } = req.query;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ connected: true, id })}

`);

  // In a real implementation, you would use a shared queue or database
  // to track the progress for each zine creation request.
  // For our demo, we'll simulate progress with timeouts
  
  // Track which steps we've sent to avoid duplicates
  const sentSteps = new Set();
  
  // Define the progress steps
  const steps = [
    { step: 'planning', delay: 1000 },       // Story planning step
    { step: 'content', delay: 3000 },        // Content generation step
    { step: 'generating', delay: 5000 },     // Image generation step 
    { step: 'assembling', delay: 2000 }      // Final assembly step
  ];
  
  // Send updates for each step
  steps.forEach(({ step, delay }, index) => {
    const totalDelay = steps.slice(0, index + 1)
      .reduce((sum, item) => sum + item.delay, 0);
      
    setTimeout(() => {
      // Only send if the connection is still open
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ step })}

`);
        
        // If this is the last step, close the connection
        if (index === steps.length - 1) {
          res.end();
        }
      }
    }, totalDelay);
  });
  
  // Handle client disconnect
  req.on('close', () => {
    // Clean up any resources if needed
    console.log(`[Progress] Client disconnected from progress updates for ID: ${id}`);
    res.end();
  });
}
