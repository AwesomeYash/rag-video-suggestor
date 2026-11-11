import { embed } from "ai";
import { cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db/db";
import { chunks, content } from "@/db/schema";
import { getEmbeddingModel } from "@/lib/embedding/get-embedding-model";

// Only chunks that match the query at least this well are returned
export const MIN_SIMILARITY = 0.5;
export const MAX_RESULTS = 20;

/**
 * Finds the content whose chunks best match the query. Each piece of content
 * appears once, with the similarity, start position and text of its
 * best-matching chunk, and the results are sorted best match first.
 */
export async function searchContent(query: string) {
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: query,
  });

  // cosineDistance is 0 for identical vectors, so 1 - distance is the match
  const similarity = sql<number>`1 - (${cosineDistance(chunks.embedding, embedding)})`.mapWith(
    Number,
  );

  // DISTINCT ON keeps one row per content item: the one that sorts first,
  // which is the chunk with the highest similarity
  const matches = await db
    .selectDistinctOn([content.id], {
      id: content.id,
      title: content.title,
      description: content.description,
      thumbnailUrl: content.thumbnailUrl,
      url: content.url,
      publishDate: content.publishDate,
      type: content.type,
      similarity,
      startPosition: chunks.startPosition,
      rawText: chunks.text,
    })
    .from(chunks)
    .innerJoin(content, eq(content.id, chunks.contentId))
    .where(gt(similarity, MIN_SIMILARITY))
    .orderBy(content.id, desc(similarity));

  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_RESULTS);
}

export type SearchResult = Awaited<ReturnType<typeof searchContent>>[number];
