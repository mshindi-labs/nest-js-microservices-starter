import 'dotenv/config';

export const JWT_SECRET = process.env.JWT_SECRET || '';
export const JWT_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_EXPIRES_IN_DAYS = 90;
export const BCRYPT_ROUNDS = 10;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;
export const OTP_DIGITS = 6;
export const OTP_EXPIRY_MINUTES = 10;
export const INVITATION_EXPIRES_IN_DAYS = 7;
export const X_API_KEY = process.env.X_API_KEY || '';
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
export const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || '';
export const FRONTEND_AUTH_CALLBACK_URL =
  process.env.FRONTEND_AUTH_CALLBACK_URL || '';

export const SEED_ORG_ID = process.env.SEED_ORG_ID || '';
export const SEED_USER_ID = process.env.SEED_USER_ID || '';
export const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || '';
export const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || '';
