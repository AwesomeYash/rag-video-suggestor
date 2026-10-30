import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { start } from "workflow/api";
import { serverEnv } from "@/app/data/serverEnv";
import { ingestBlogArticlesWorkflow } from "@/app/workflows/ingestBlogArticles";

export async function POST(request: NextRequest) {
  const expected = Buffer.from(`Bearer ${serverEnv.CRON_SECRET}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const run = await start(ingestBlogArticlesWorkflow);

  return Response.json({ message: "Ingestion started", runId: run.runId });
}
