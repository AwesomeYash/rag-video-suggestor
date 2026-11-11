import type { youtube_v3 } from "googleapis";

export function videoUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Picks the English caption track to download: a human-written one if there is
 * one, otherwise an auto-generated one.
 */
export function pickEnglishCaptionTrack(tracks: youtube_v3.Schema$Caption[]) {
  const english = tracks.filter(track =>
    track.snippet?.language?.toLowerCase().startsWith("en"),
  );

  return (
    english.find(track => track.snippet?.trackKind !== "asr") ?? english[0]
  );
}

/** Picks the largest thumbnail YouTube has for a video. */
export function pickThumbnailUrl(thumbnails: youtube_v3.Schema$ThumbnailDetails) {
  const { maxres, standard, high, medium, default: small } = thumbnails;
  return (maxres ?? standard ?? high ?? medium ?? small)?.url ?? undefined;
}

/**
 * Whether a failed YouTube API request is worth retrying. A 4xx means the
 * request itself is wrong, or we lack access or quota, so repeating it right
 * away can't help. Rate limits (429), server errors and network failures can.
 */
export function isRetryableYouTubeError(error: unknown) {
  const status =
    typeof error === "object" && error != null && "status" in error
      ? Number(error.status)
      : undefined;

  return status == null || Number.isNaN(status) || status >= 500 || status === 429;
}
