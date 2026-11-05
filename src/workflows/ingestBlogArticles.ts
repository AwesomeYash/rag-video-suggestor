import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { eq } from "drizzle-orm";
import { FatalError } from "workflow";
import * as z from "zod";
import { db } from "@/db/db";
import { chunks, content } from "@/db/schema";
import { chunkArticles } from "@/lib/chunking/chunkArticles";
import { batchExec } from "./utils/batchExec";

const RSS_URL = "https://blog.webdevsimplified.com/rss.xml";
const BATCH_SIZE = 10;

const feedItemSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  link: z.url(),
  pubDate: z.coerce.date(),
});

// Passed between the workflow and its steps, so it must stay serializable.
type FeedArticle = {
  title: string;
  description: string;
  url: string;
  publishDate: string;
};

export async function ingestBlogArticlesWorkflow() {
  "use workflow";

  const newArticles = await getNewArticlesFromRssFeed();

  // Send requests to the blog in batches so we never hit it with every
  // article at once. A failed article doesn't stop the rest of its batch.
  const { failedItems, ...result } = await batchExec(
    newArticles,
    ingestArticleStep,
    { batchSize: BATCH_SIZE },
  );

  return { ...result, failedUrls: failedItems.map(article => article.url) };
}

// Step 1: every article in the RSS feed that isn't in the database yet
async function getNewArticlesFromRssFeed(): Promise<FeedArticle[]> {
  "use step";

  const parser = new Parser({ customFields: { item: ["description"] } });
  const feed = await parser.parseURL(RSS_URL);

  const existingUrls = new Set(
    (await db.select({ url: content.url }).from(content)).map(row => row.url),
  );

  const articles: FeedArticle[] = [];
  for (const feedItem of feed.items) {
    const { data: item } = feedItemSchema.safeParse(feedItem);
    // Skip malformed feed entries instead of failing the whole run
    if (item == null || existingUrls.has(item.link)) continue;

    articles.push({
      title: item.title,
      description: item.description,
      url: item.link,
      publishDate: item.pubDate.toISOString(),
    });
  }

  return articles;
}

// Step 2: fetch one article, chunk it, and save it. Safe to retry: an article
// that was already saved is skipped.
async function ingestArticleStep(
  article: FeedArticle,
): Promise<void> {
  "use step";

  const [existing] = await db
    .select({ id: content.id })
    .from(content)
    .where(eq(content.url, article.url))
    .limit(1);
  if (existing != null) return;

  const response = await fetch(article.url);
  if (response.status === 404) {
    throw new FatalError(`Article not found: ${article.url}`);
  }
  if (!response.ok) {
    // Retried automatically
    throw new Error(`Failed to fetch ${article.url}: ${response.status}`);
  }

  const $ = cheerio.load(await response.text());
  const mainHtml = $("article main").html();
  if (mainHtml == null) {
    throw new FatalError(`No "article main" element found: ${article.url}`);
  }

  const thumbnailSrc =
    $('meta[property="og:image"]').attr("content") ??
    $('meta[name="twitter:image"]').attr("content");
  if (thumbnailSrc == null) {
    throw new FatalError(`No thumbnail image found: ${article.url}`);
  }

  const chunkTexts = chunkArticles(mainHtml);
  if (chunkTexts.length === 0) {
    throw new FatalError(`No article text found: ${article.url}`);
  }

  // Generate the id here so the content and its chunks can be written together
  const contentId = crypto.randomUUID();

  // Both inserts run in one transaction: an article is never saved without
  // its chunks
  await db.batch([
    db.insert(content).values({
      id: contentId,
      title: article.title,
      description: article.description,
      publishDate: new Date(article.publishDate),
      url: article.url,
      thumbnailUrl: new URL(thumbnailSrc, article.url).href,
      type: "article",
      content: mainHtml,
    }),
    db.insert(chunks).values(
      chunkTexts.map(text => ({
        contentId,
        startPosition: null,
        embedding: null,
        text,
      })),
    ),
  ]);
}
