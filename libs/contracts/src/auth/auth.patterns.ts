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
  LIST_SESSIONS: 'auth.sessions.list',
  REVOKE_SESSION: 'auth.sessions.revoke',
  REVOKE_ALL_SESSIONS: 'auth.sessions.revoke_all',
  SEND_EMAIL_VERIFICATION: 'auth.email.verification.send',
  VERIFY_EMAIL: 'auth.email.verify',
  SWITCH_ORG: 'auth.org.switch',
} as const;

export type AuthPattern = (typeof AUTH_PATTERNS)[keyof typeof AUTH_PATTERNS];
