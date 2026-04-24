export const AUTH_PATTERNS = {
  SIGNUP: 'auth.signup',
  LOGIN: 'auth.login',
  REFRESH: 'auth.refresh',
  ME: 'auth.me',
  PASSWORD_UPDATE: 'auth.password.update',
  PASSWORD_RESET_REQUEST: 'auth.password.reset.request',
  PASSWORD_RESET: 'auth.password.reset',
  OTP_REQUEST: 'auth.otp.request',
  OTP_RESEND: 'auth.otp.resend',
  OTP_VERIFY: 'auth.otp.verify',
  GOOGLE_CALLBACK: 'auth.google.callback',
} as const;

export type AuthPattern = (typeof AUTH_PATTERNS)[keyof typeof AUTH_PATTERNS];
