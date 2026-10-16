import OpenAI from "openai";

// OPENAI_API_KEY is a key from platform.openai.com; the AI_INTEGRATIONS_* pair
// is Replit's billed proxy and is only used as a fallback.
const apiKey = process.env.OPENAI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY must be set.");
}

export const openai = new OpenAI({
  apiKey,
  baseURL: process.env.OPENAI_API_KEY
    ? process.env.OPENAI_BASE_URL
    : process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});
