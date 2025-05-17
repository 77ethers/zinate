import { OpenAI } from 'openai';

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
      const { storyPlan } = data;

      if (!storyPlan || !storyPlan.title || !storyPlan.description || !storyPlan.storyArc || !Array.isArray(storyPlan.storyArc)) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Valid story plan is required' 
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // Initialize OpenAI with the API key from environment variables
      const openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });

      // Extract data from story plan
      const { title, description, storyArc } = storyPlan;
      console.log(`[ContentGenerator] Generating content for story: "${title}"`);
      
      // Use chat.completions for more reliable JSON formatting
      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using GPT-4o-mini as specified
        messages: [
          {
            role: "system",
            content: `You are creating content for a visual mythic zine with the title: "${title}". Create both descriptive text and image generation prompts for each page.`
          },
          {
            role: "user",
            content: `Story title: "${title}"
Story description: "${description}"

For each of the following 5 story beats, create poetic text (1-3 sentences) and a detailed image prompt:

1. ${storyArc[0]}
2. ${storyArc[1]}
3. ${storyArc[2]}
4. ${storyArc[3]}
5. ${storyArc[4]}

The text should be evocative and mythic in tone. Image prompts should be detailed for generating artistic, mythic visuals.

Respond with a JSON array of exactly 5 objects, one for each page, with this format:
[
  {
    "pageNumber": 1,
    "text": "The poetic text for this page (1-3 sentences)",
    "imagePrompt": "Detailed image generation prompt for this page"
  },
  ...
]`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });
      
      try {
        // Parse the response and extract the content
        const content = JSON.parse(chatCompletion.choices[0].message.content);
        console.log("[ContentGenerator] Successfully generated content for zine pages");
        
        return new Response(JSON.stringify({ 
          success: true, 
          content 
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (parseError) {
        console.error("[ContentGenerator] JSON parse error:", parseError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Failed to parse content generation response", 
          rawContent: chatCompletion.choices[0].message.content 
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error("[ContentGenerator] Error generating content:", error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to generate content and image prompts"
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
