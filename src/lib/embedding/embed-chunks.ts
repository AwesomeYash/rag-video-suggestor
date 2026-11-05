import { embedMany } from "ai";
import { FatalError } from "workflow";
import { getEmbeddingModel } from "./get-embedding-model";

// OpenAI bills embeddings per input token, so these keep a surprise from
// getting expensive. At roughly 4 characters per token, a call at the cap
// is about 60,000 tokens, a tiny fraction of a cent.
// Text past MAX_CHARS_PER_CHUNK is not embedded (it is still stored), which
// also keeps every chunk under the model's 8,191 token input limit.
const MAX_CHARS_PER_CHUNK = 20_000;
const MAX_CHARS_PER_CALL = 250_000;

export async function embedChunks(texts: string[]) {
  if (texts.length === 0) return [];

  const values = texts.map(text => text.slice(0, MAX_CHARS_PER_CHUNK));

  const totalChars = values.reduce((sum, value) => sum + value.length, 0);
  if (totalChars > MAX_CHARS_PER_CALL) {
    // Fatal so the workflow doesn't retry something that will always fail
    throw new FatalError(
      `Refusing to embed ${totalChars} characters in one call (limit ${MAX_CHARS_PER_CALL})`,
    );
  }

  const { embeddings } = await embedMany({
    model: getEmbeddingModel(),
    values,
  });

  return embeddings;
}
