import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

export const NEON_DB_POOL = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});
