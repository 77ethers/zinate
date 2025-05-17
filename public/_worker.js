// This file is required for Cloudflare Pages to handle Next.js routing
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Handle static assets
  if (url.pathname.includes('.')) {
    return fetch(request);
  }

  // Special handling for API routes
  if (url.pathname.startsWith('/api/')) {
    // Pass through API requests
    return fetch(request);
  }
  
  // Handle view/[id] dynamic routes
  if (url.pathname.startsWith('/view/')) {
    return fetch(request);
  }
  
  // For all other paths, serve index.html for client-side routing
  return fetch(new URL('/index.html', request.url));
}
