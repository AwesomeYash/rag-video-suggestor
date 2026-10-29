import 'dotenv/config';
import { serverEnv } from '@/app/data/serverEnv';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    out: './src/app/db/migrations',
    schema: './src/app/db/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: serverEnv.DATABASE_URL,
    },
});
