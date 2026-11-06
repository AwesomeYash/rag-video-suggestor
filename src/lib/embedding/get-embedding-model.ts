import { createOpenAI } from "@ai-sdk/openai";
import { serverEnv } from "@/data/serverEnv";

// 1536 dimensions, which is what chunks.embedding is sized for. It is also
// OpenAI's cheapest embedding model.
const OPENAI_MODEL = "text-embedding-3-small";

export function getEmbeddingModel() {
  const openai = createOpenAI({ apiKey: serverEnv.OPENAI_API_KEY });
  return openai.embedding(OPENAI_MODEL);
}
