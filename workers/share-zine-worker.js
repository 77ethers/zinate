import { OpenAI } from 'openai';

export default {
  async fetch(request, env) {
    // CORS headers
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

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // GET request to retrieve a shared zine
      if (request.method === 'GET' && path.startsWith('/share/')) {
        const zineId = path.replace('/share/', '');
        
        if (!zineId) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Zine ID is required' 
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        // Query the D1 database to get the zine
        const stmt = env.DB.prepare(
          'SELECT * FROM zines WHERE id = ?'
        ).bind(zineId);
        
        const result = await stmt.first();
        
        if (!result) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Zine not found' 
          }), {
            status: 404,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        // Parse the stored zine data
        const zineData = JSON.parse(result.zine_data);
        
        return new Response(JSON.stringify({ 
          success: true, 
          zine: {
            id: result.id,
            title: result.title,
            prompt: result.prompt,
            createdAt: result.created_at,
            items: zineData.items
          } 
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      // POST request to save a new shared zine
      if (request.method === 'POST' && path === '/share') {
        const data = await request.json();
        const { title, prompt, items } = data;

        if (!items || !Array.isArray(items) || items.length === 0) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Valid zine items are required' 
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        // Generate a unique ID for the zine
        // Using a UUID-like format
        const id = generateId();
        
        // Store the zine in the D1 database
        const stmt = env.DB.prepare(
          'INSERT INTO zines (id, title, prompt, zine_data, created_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(
          id, 
          title || 'Unnamed Zine',
          prompt || '',
          JSON.stringify({ items }),
          new Date().toISOString()
        );
        
        await stmt.run();
        
        console.log(`[ShareZine] Stored zine with ID: ${id}`);
        
        return new Response(JSON.stringify({ 
          success: true,
          id,
          shareUrl: `${url.origin}/view/${id}`
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // If we get here, the request wasn't handled
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error("[ShareZine] Error:", error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message || "An unexpected error occurred"
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

// Helper function to generate a random ID
function generateId() {
  // Generate a string of 6 random alphanumeric characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 10; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
