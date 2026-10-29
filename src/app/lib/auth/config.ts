import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { nextCookies } from "better-auth/next-js";
import { serverEnv } from "../../data/serverEnv";
import { db } from "../../db/db";
import * as authSchema from "../../db/schemas/auth";
import * as schema from "../../db/schema";

export const auth = betterAuth({
    secret: serverEnv.BETTER_AUTH_SECRET,
    baseURL: serverEnv.BETTER_AUTH_URL,
    // Vercel branch/preview deployments are served from their own hosts, which
    // Better Auth would otherwise reject as an invalid origin.
    trustedOrigins: ["https://rag-video-suggestor-*-priyanshu-rankas-projects.vercel.app"],
    database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
    advanced: {
        database: {
            generateId: "uuid",
        }
    },
    socialProviders: {
        github: {
            clientId: serverEnv.GITHUB_CLIENT_ID,
            clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
        },
    },
    // Keep this last so cookies set from Server Actions are applied
    plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
