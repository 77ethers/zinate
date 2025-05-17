import OpenAI from 'openai';

class StoryPlannerService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateStory(prompt) {
    try {
      console.log(`[StoryPlanner] Generating story plan for prompt: "${prompt.substring(0, 30)}..."`);
      
      // Using the standard chat.completions API for JSON output
      const chatCompletion = await this.openai.chat.completions.create({
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
        return { success: true, storyPlan };
      } catch (parseError) {
        console.error("[StoryPlanner] JSON parse error:", parseError);
        return { 
          success: false, 
          error: "Failed to parse story plan response", 
          rawContent: chatCompletion.choices[0].message.content 
        };
      }
    } catch (error) {
      console.error("[StoryPlanner] Error generating story:", error);
      
      // Provide more detailed error information for parse errors
      if (error.code === 'parse_text_error') {
        console.error("[StoryPlanner] Parse error details:", error.parsed);
        return {
          success: false,
          error: "Failed to parse story plan response",
          parseError: error.parsed
        };
      }
      
      // Handle all other types of errors
      return { 
        success: false, 
        error: error.message || "Failed to generate story plan"
      };
    }
  }
}

export default StoryPlannerService;
