// Pure rate limit rules, kept apart from the database code so they can be
// tested without one.

export type RateLimitStatus =
  | { allowed: true }
  | { allowed: false; retryAt: Date };

/**
 * Decides whether another search is allowed.
 *
 * `recentSearchTimes` are the times of the user's latest searches inside the
 * window, newest first. Only the newest `maxRequests` are needed: once the
 * user has that many, the next search is allowed when the oldest of them is
 * more than `windowMs` old.
 */
export function getRateLimitStatus(
  recentSearchTimes: Date[],
  { maxRequests, windowMs }: { maxRequests: number; windowMs: number },
): RateLimitStatus {
  if (recentSearchTimes.length < maxRequests) return { allowed: true };

  const oldestCounted = recentSearchTimes[maxRequests - 1];
  return {
    allowed: false,
    retryAt: new Date(oldestCounted.getTime() + windowMs),
  };
}

/** The start of the window: only searches after this time count. */
export function getWindowStart(now: Date, windowHours: number) {
  return new Date(now.getTime() - windowHours * 60 * 60 * 1000);
}

/** "less than a minute", "5 minutes", "1 hour 5 minutes" */
export function formatWait(ms: number) {
  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes <= 1) return "less than a minute";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  return parts.join(" ");
}

export function rateLimitMessage({
  maxRequests,
  windowHours,
  retryAt,
  now,
}: {
  maxRequests: number;
  windowHours: number;
  retryAt: Date;
  now: Date;
}) {
  const searches = `${maxRequests} search${maxRequests === 1 ? "" : "es"}`;
  const window = `${windowHours} hour${windowHours === 1 ? "" : "s"}`;
  const wait = formatWait(retryAt.getTime() - now.getTime());

  return `You've used your ${searches} for the last ${window}. Try again in ${wait}.`;
}
