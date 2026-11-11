import {
  index,
  integer,
  snakeCase,
  text,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "../utils";
import { content } from "./content";

export const chunks = snakeCase.table(
  "chunks",
  {
    id,
    contentId: uuid()
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    // Position within the source (e.g. seconds into a video). Unused for articles.
    startPosition: integer(),
    embedding: vector({ dimensions: 1536 }).notNull(),
    text: text().notNull(),
    ...timestamps,
  },
  table => [
    index("chunks_contentId_idx").on(table.contentId),
    // Speeds up nearest-neighbour searches on the embedding
    index("embedding_index").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);
