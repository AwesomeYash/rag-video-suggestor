import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { start } from "workflow/api";
import { serverEnv } from "@/data/serverEnv";

export async function verifyAndRunCron(
  request: NextRequest,
  runCron: () => Promise<unknown>,
) {
  const expected = Buffer.from(`Bearer ${serverEnv.CRON_SECRET}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const run = await start(runCron);

  return Response.json({ message: "Cron started", runId: run.runId });
}
