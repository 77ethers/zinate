import { OpenAI } from 'openai';

export default {
  async fetch(request, env) {
    // CORS headers - ensure these are properly implemented
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
      const { prompt } = data;

      if (!prompt || prompt.trim().length < 10) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Prompt must be at least 10 characters long.' 
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

      console.log(`[StoryPlanner] Generating story plan for prompt: "${prompt.substring(0, 30)}..."`);
      
      // Using the standard chat.completions API for JSON output
      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-4o", // Using GPT-4o as specified
        messages: [
          {
            role: "system",
            content: "You are a master storyteller for a mythic zine. Create a compelling, cohesive 5-part narrative arc. if the characters present in the theme are from ancient known scriptures, provide their stories only. be creative and gripping."
          },
          {
            role: "user",
            content: `Create a mythic story based on this theme: "${prompt}".

Respond with a JSON object with the following structure:
{
  "title": "The title of the story",
  "description": "A 1-2 sentence overview of the story",
  "pages": 5,
  "storyArc": [
    "beginning",
    "rising action",
    "climax",
    "falling action",
    "resolution"
  ]
}

The storyArc should have 5 brief descriptions (1-2 sentences each) that follow a narrative arc.`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      try {
        const storyPlan = JSON.parse(chatCompletion.choices[0].message.content);
        console.log("[StoryPlanner] Successfully created story plan");
        
        return new Response(JSON.stringify({ 
          success: true, 
          storyPlan 
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (parseError) {
        console.error("[StoryPlanner] JSON parse error:", parseError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Failed to parse story plan response", 
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
      console.error("[StoryPlanner] Error generating story:", error);
      
      // Handle all types of errors
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to generate story plan"
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
