import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const serverEnv = createEnv({
    server: {
        DATABASE_URL: z.url(),
        BETTER_AUTH_SECRET: z.string().min(32),
        BETTER_AUTH_URL: z.url(),
        GITHUB_CLIENT_ID: z.string().min(1),
        GITHUB_CLIENT_SECRET: z.string().min(1),
        // Authorizes requests that start the ingestion workflows
        CRON_SECRET: z.string().min(16),
        OPENAI_API_KEY: z.string().min(1),
        // OAuth credentials for the YouTube channel that owns the videos
        GOOGLE_CLIENT_ID: z.string().min(1),
        GOOGLE_CLIENT_SECRET: z.string().min(1),
        GOOGLE_REFRESH_TOKEN: z.string().min(1),
        // A user can search at most RATE_LIMIT_MAX_REQUESTS times within the
        // last RATE_LIMIT_WINDOW_HOURS hours
        RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive(),
        RATE_LIMIT_WINDOW_HOURS: z.coerce.number().positive(),
    },
    experimental__runtimeEnv: process.env,
    emptyStringAsUndefined: true,
});
