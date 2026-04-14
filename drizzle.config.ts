import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.EXPO_PUBLIC_DATABASE_URL || 'postgresql://neondb_owner:npg_14tAwPpRzqOB@ep-rough-silence-abzvofgy-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  },
});