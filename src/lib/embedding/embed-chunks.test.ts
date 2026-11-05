import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockEmbeddingModelV4 } from "ai/test";

const model = new MockEmbeddingModelV4({
  // Same as OpenAI, so the chunks go out in a single call
  maxEmbeddingsPerCall: 2048,
  doEmbed: async ({ values }) => ({
    embeddings: values.map(() => [0.1, 0.2, 0.3]),
    usage: { tokens: values.length },
    warnings: [],
  }),
});

vi.mock("./get-embedding-model", () => ({ getEmbeddingModel: () => model }));

// Imported after the mock is registered
const { embedChunks } = await import("./embed-chunks");

describe("embedChunks", () => {
  beforeEach(() => {
    model.doEmbedCalls.length = 0;
  });

  it("returns one embedding per chunk, in order", async () => {
    const embeddings = await embedChunks(["a", "b", "c"]);

    expect(embeddings).toHaveLength(3);
    expect(model.doEmbedCalls[0].values).toEqual(["a", "b", "c"]);
  });

  it("makes no API call when there is nothing to embed", async () => {
    expect(await embedChunks([])).toEqual([]);
    expect(model.doEmbedCalls).toHaveLength(0);
  });

  it("truncates a single oversized chunk instead of sending all of it", async () => {
    await embedChunks(["x".repeat(30_000)]);

    expect(model.doEmbedCalls[0].values[0]).toHaveLength(20_000);
  });

  it("refuses to embed an unexpectedly large batch, without calling the API", async () => {
    const chunks = Array.from({ length: 20 }, () => "x".repeat(15_000));

    await expect(embedChunks(chunks)).rejects.toThrow(/Refusing to embed/);
    expect(model.doEmbedCalls).toHaveLength(0);
  });
});
