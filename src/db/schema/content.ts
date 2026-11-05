import { date, pgEnum, snakeCase, text } from "drizzle-orm/pg-core";
import { id, timestamps } from "../utils";

export const contentTypes = ["video", "article"] as const;
export const contentType = pgEnum("content_type", contentTypes);

export const content = snakeCase.table("content", {
  id,
  title: text().notNull(),
  description: text().notNull(),
  publishDate: date({ mode: "date" }).notNull(),
  url: text().notNull().unique(),
  thumbnailUrl: text().notNull(),
  type: contentType().notNull(),
  // Raw HTML of the article's main content
  content: text().notNull(),
  ...timestamps,
});
