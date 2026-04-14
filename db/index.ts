import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Create the connection
const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);

// Create the database instance
export const db = drizzle(sql, { schema });

// Export all schema for convenience
export * from './schema';