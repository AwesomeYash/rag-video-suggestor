import { parseSync } from "subtitle";

// One text section of the captions, with when it starts in milliseconds
export type CaptionSegment = { text: string; startTime: number };

export type CaptionChunk = { text: string; startTime: number };

export const CHUNK_SIZE = 15;
export const OVERLAP_SIZE = 3;

/** Parses an .srt file into its text segments, in order, skipping empty ones. */
export function parseCaptions(srt: string): CaptionSegment[] {
  return parseSync(srt)
    .flatMap(node => (node.type === "cue" ? [node.data] : []))
    .map(cue => ({ text: cleanText(cue.text), startTime: cue.start }))
    .filter(segment => segment.text.length > 0);
}

/**
 * Groups segments into chunks of `chunkSize` segments, where each chunk repeats
 * the last `overlapSize` segments of the one before it. A chunk's startTime is
 * when its first segment starts.
 */
export function chunkCaptions(
  segments: CaptionSegment[],
  { chunkSize = CHUNK_SIZE, overlapSize = OVERLAP_SIZE } = {},
): CaptionChunk[] {
  if (overlapSize >= chunkSize) {
    throw new Error("overlapSize must be smaller than chunkSize");
  }

  const step = chunkSize - overlapSize;
  const result: CaptionChunk[] = [];

  for (let start = 0; start < segments.length; start += step) {
    const chunk = segments.slice(start, start + chunkSize);
    result.push({
      text: chunk.map(segment => segment.text).join(" "),
      startTime: chunk[0].startTime,
    });

    // This chunk reaches the end. The next one would only repeat its tail.
    if (start + chunkSize >= segments.length) break;
  }

  return result;
}

// Captions can carry line breaks, <i>-style tags and HTML entities
function cleanText(text: string) {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
