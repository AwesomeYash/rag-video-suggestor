import { google } from "googleapis";
import type { youtube_v3 } from "googleapis";
import { eq } from "drizzle-orm";
import { FatalError } from "workflow";
import * as z from "zod";
import { serverEnv } from "@/data/serverEnv";
import { db } from "@/db/db";
import { chunks, content } from "@/db/schema";
import { chunkCaptions, parseCaptions } from "@/lib/chunking/chunkCaptions";
import { embedChunks } from "@/lib/embedding/embed-chunks";
import {
  isRetryableYouTubeError,
  pickEnglishCaptionTrack,
  pickThumbnailUrl,
  videoUrl,
} from "@/lib/youtube/helpers";
import { batchExec } from "./utils/batchExec";

const BATCH_SIZE = 10;
// Each caption download uses a lot of the daily YouTube API quota, so wait
// between batches instead of spending it all at once
const BATCH_DELAY_MS = 9 * 60 * 60 * 1000;

const videoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  publishedAt: z.coerce.date(),
  thumbnailUrl: z.url(),
});

// Passed between the workflow and its steps, so it must stay serializable.
type ChannelVideo = {
  id: string;
  title: string;
  description: string;
  publishDate: string;
  thumbnailUrl: string;
};

export async function ingestYouTubeVideosWorkflow() {
  "use workflow";

  const newVideos = await getNewVideosFromChannel();

  const { failedItems, ...result } = await batchExec(
    newVideos,
    ingestVideoStep,
    { batchSize: BATCH_SIZE, delayMs: BATCH_DELAY_MS },
  );

  return { ...result, failedUrls: failedItems.map(video => videoUrl(video.id)) };
}

// Step 1: every public video on the channel that isn't in the database yet
async function getNewVideosFromChannel(): Promise<ChannelVideo[]> {
  "use step";

  const youtube = createYouTubeClient();

  const uploadsPlaylistId = await callYouTube(async () => {
    const { data } = await youtube.channels.list({
      part: ["contentDetails"],
      mine: true,
    });
    return data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  }, "Failed to load the channel");
  if (uploadsPlaylistId == null) {
    throw new FatalError("The channel has no uploads playlist");
  }

  const playlistItems: youtube_v3.Schema$PlaylistItem[] = [];
  let pageToken: string | undefined;
  do {
    const page = await callYouTube(async () => {
      const { data } = await youtube.playlistItems.list({
        part: ["snippet", "contentDetails", "status"],
        playlistId: uploadsPlaylistId,
        maxResults: 50,
        pageToken,
      });
      return data;
    }, "Failed to list the channel's videos");

    playlistItems.push(
      ...(page.items ?? []).filter(
        item => item.status?.privacyStatus === "public",
      ),
    );
    pageToken = page.nextPageToken ?? undefined;
  } while (pageToken != null);

  const existingUrls = new Set(
    (await db.select({ url: content.url }).from(content)).map(row => row.url),
  );

  const videos: ChannelVideo[] = [];
  for (const item of playlistItems) {
    const { data: video } = videoSchema.safeParse({
      id: item.contentDetails?.videoId,
      title: item.snippet?.title,
      description: item.snippet?.description,
      publishedAt: item.snippet?.publishedAt,
      thumbnailUrl: pickThumbnailUrl(item.snippet?.thumbnails ?? {}),
    });
    // Skip malformed or deleted entries instead of failing the whole run
    if (video == null || existingUrls.has(videoUrl(video.id))) continue;

    videos.push({
      id: video.id,
      title: video.title,
      description: video.description,
      publishDate: video.publishedAt.toISOString(),
      thumbnailUrl: video.thumbnailUrl,
    });
  }

  return videos;
}

// Step 2: download one video's captions, chunk them, and save the video. Safe
// to retry: a video that was already saved is skipped.
async function ingestVideoStep(video: ChannelVideo): Promise<void> {
  "use step";

  const url = videoUrl(video.id);

  const [existing] = await db
    .select({ id: content.id })
    .from(content)
    .where(eq(content.url, url))
    .limit(1);
  if (existing != null) return;

  const youtube = createYouTubeClient();

  const captionId = await callYouTube(async () => {
    const { data } = await youtube.captions.list({
      part: ["snippet"],
      videoId: video.id,
    });
    return pickEnglishCaptionTrack(data.items ?? [])?.id;
  }, `Failed to list the captions for ${url}`);
  if (captionId == null) {
    throw new FatalError(`No English captions available: ${url}`);
  }

  const srt = await callYouTube(async () => {
    const { data } = await youtube.captions.download(
      { id: captionId, tfmt: "srt" },
      { responseType: "text" },
    );
    return data as string;
  }, `Failed to download the captions for ${url}`);

  const captionChunks = chunkCaptions(parseCaptions(srt));
  if (captionChunks.length === 0) {
    throw new FatalError(`No caption text found: ${url}`);
  }

  const embeddings = await embedChunks(captionChunks.map(chunk => chunk.text));

  // Generate the id here so the content and its chunks can be written together
  const contentId = crypto.randomUUID();

  // Both inserts run in one transaction: a video is never saved without its
  // chunks
  await db.batch([
    db.insert(content).values({
      id: contentId,
      title: video.title,
      description: video.description,
      publishDate: new Date(video.publishDate),
      url,
      thumbnailUrl: video.thumbnailUrl,
      type: "video",
      content: srt,
    }),
    db.insert(chunks).values(
      captionChunks.map((chunk, i) => ({
        contentId,
        // When the chunk's first caption starts, in milliseconds
        startPosition: chunk.startTime,
        embedding: embeddings[i],
        text: chunk.text,
      })),
    ),
  ]);
}

// Authenticates as the channel owner using a refresh token. Caption downloads
// are only allowed for the owner of the video.
function createYouTubeClient() {
  const auth = new google.auth.OAuth2(
    serverEnv.GOOGLE_CLIENT_ID,
    serverEnv.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: serverEnv.GOOGLE_REFRESH_TOKEN });

  return google.youtube({ version: "v3", auth });
}

// Retried automatically unless the request itself was rejected
async function callYouTube<T>(request: () => Promise<T>, message: string) {
  try {
    return await request();
  } catch (error) {
    if (isRetryableYouTubeError(error)) throw error;

    const reason = error instanceof Error ? error.message : String(error);
    throw new FatalError(`${message}: ${reason}`);
  }
}
