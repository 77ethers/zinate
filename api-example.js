// normal response
import OpenAI from "openai";
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: "Write a one-sentence bedtime story about a unicorn."
});

console.log(response.output_text);


// image generation
const prompt = `
A children's book drawing of a veterinarian using a stethoscope to 
listen to the heartbeat of a baby otter.
`;

const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
});

// Save the image to a file
const image_base64 = result.data[0].b64_json;
const image_bytes = Buffer.from(image_base64, "base64");
fs.writeFileSync("otter.png", image_bytes);



// Structured JSON response
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const CalendarEvent = z.object({
  name: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
});

const structuredResponse = await openai.responses.parse({
  model: "gpt-4o-2024-08-06",
  input: [
    { role: "system", content: "Extract the event information." },
    {
      role: "user",
      content: "Alice and Bob are going to a science fair on Friday.",
    },
  ],
  text: {
    format: zodTextFormat(CalendarEvent, "event"),
  },
});

const event = structuredResponse.output_parsed;