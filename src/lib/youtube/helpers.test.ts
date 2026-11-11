import { describe, expect, it } from "vitest";
import {
  isRetryableYouTubeError,
  pickEnglishCaptionTrack,
  pickThumbnailUrl,
  videoUrl,
} from "./helpers";

const track = (id: string, language: string, trackKind = "standard") => ({
  id,
  snippet: { language, trackKind },
});

describe("pickEnglishCaptionTrack", () => {
  it("prefers a human-written English track over an auto-generated one", () => {
    const tracks = [track("auto", "en", "asr"), track("human", "en")];

    expect(pickEnglishCaptionTrack(tracks)?.id).toBe("human");
  });

  it("falls back to an auto-generated English track", () => {
    expect(pickEnglishCaptionTrack([track("auto", "en", "asr")])?.id).toBe("auto");
  });

  it("accepts regional English such as en-US", () => {
    expect(pickEnglishCaptionTrack([track("us", "en-US")])?.id).toBe("us");
  });

  it("returns nothing when there is no English track", () => {
    expect(pickEnglishCaptionTrack([track("es", "es"), track("fr", "fr")])).toBeUndefined();
    expect(pickEnglishCaptionTrack([])).toBeUndefined();
  });
});

describe("pickThumbnailUrl", () => {
  it("uses the largest thumbnail available", () => {
    expect(
      pickThumbnailUrl({ default: { url: "d" }, high: { url: "h" }, maxres: { url: "m" } }),
    ).toBe("m");
    expect(pickThumbnailUrl({ default: { url: "d" }, medium: { url: "me" } })).toBe("me");
  });

  it("returns nothing when there are no thumbnails", () => {
    expect(pickThumbnailUrl({})).toBeUndefined();
  });
});

describe("videoUrl", () => {
  it("builds the watch URL", () => {
    expect(videoUrl("abc123")).toBe("https://www.youtube.com/watch?v=abc123");
  });
});

describe("isRetryableYouTubeError", () => {
  it("does not retry client errors such as a missing video or no access", () => {
    expect(isRetryableYouTubeError({ status: 404 })).toBe(false);
    expect(isRetryableYouTubeError({ status: 403 })).toBe(false);
    expect(isRetryableYouTubeError({ status: 401 })).toBe(false);
  });

  it("retries rate limits, server errors and errors with no status", () => {
    expect(isRetryableYouTubeError({ status: 429 })).toBe(true);
    expect(isRetryableYouTubeError({ status: 503 })).toBe(true);
    expect(isRetryableYouTubeError(new Error("socket hang up"))).toBe(true);
  });
});
