import { and, desc, eq, gt } from "drizzle-orm";
import { serverEnv } from "@/data/serverEnv";
import { db } from "@/db/db";
import { userSearches } from "@/db/schema";
import {
  getRateLimitStatus,
  getWindowStart,
  rateLimitMessage,
} from "./rateLimitWindow";

/**
 * Checks whether the user may search now: at most RATE_LIMIT_MAX_REQUESTS
 * searches within the previous RATE_LIMIT_WINDOW_HOURS hours, counted from the
 * current time. Searches come from the `user_searches` table.
 */
export async function checkRateLimit(userId: string, now = new Date()) {
  const maxRequests = serverEnv.RATE_LIMIT_MAX_REQUESTS;
  const windowHours = serverEnv.RATE_LIMIT_WINDOW_HOURS;

  const recent = await db
    .select({ createdAt: userSearches.createdAt })
    .from(userSearches)
    .where(
      and(
        eq(userSearches.userId, userId),
        gt(userSearches.createdAt, getWindowStart(now, windowHours)),
      ),
    )
    .orderBy(desc(userSearches.createdAt))
    .limit(maxRequests);

  const status = getRateLimitStatus(
    recent.map(row => row.createdAt),
    { maxRequests, windowMs: windowHours * 60 * 60 * 1000 },
  );
  if (status.allowed) return { allowed: true } as const;

  return {
    allowed: false,
    message: rateLimitMessage({
      maxRequests,
      windowHours,
      retryAt: status.retryAt,
      now,
    }),
  } as const;
}

/**
 * Saves a search before it runs, so it counts towards the limit right away
 * and requests sent at the same time can't all slip through.
 */
export async function recordSearch(userId: string, queryText: string) {
  const [search] = await db
    .insert(userSearches)
    // Uses this server's clock, the same one checkRateLimit compares against,
    // instead of the database's, so the two can't drift apart
    .values({ userId, queryText, createdAt: new Date() })
    .returning({ id: userSearches.id });

  return search.id;
}

/** Adds the content a search returned to its row. */
export async function saveSearchResults(
  searchId: string,
  resultContents: string[],
) {
  await db
    .update(userSearches)
    .set({ resultContents })
    .where(eq(userSearches.id, searchId));
}

/** Removes a search that failed, so an error doesn't use up the user's limit. */
export async function deleteSearch(searchId: string) {
  await db.delete(userSearches).where(eq(userSearches.id, searchId));
}
