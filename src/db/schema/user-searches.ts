import { index, snakeCase, text, uuid } from "drizzle-orm/pg-core";
import { id, timestamps } from "../utils";
import { user } from "./auth";

// One row per search a user makes. Used for rate limiting and as a search log.
export const userSearches = snakeCase.table(
  "user_searches",
  {
    id,
    queryText: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Ids of the content the search returned, best match first. Empty until the
    // search finishes.
    resultContents: uuid().array().notNull().default([]),
    createdAt: timestamps.createdAt,
  },
  table => [
    // Rate limiting looks up a user's most recent searches
    index("user_searches_userId_createdAt_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);
