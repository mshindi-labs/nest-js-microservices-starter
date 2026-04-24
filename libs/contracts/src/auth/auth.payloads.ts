export interface JwtPayload {
  sub: string;
  accountId: string;
  jti: string;
  name: string;
  roleId: string;
  roleName: string;
  organizationId: string | null;
  email?: string;
  msisdn?: string;
  iat?: number;
  exp?: number;
}

export interface AuthContext {
  readonly userId: string;
  readonly accountId: string;
  readonly name: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly organizationId: string | null;
  readonly email?: string;
  readonly msisdn?: string;
}

export interface SignupPayload {
  readonly name: string;
  readonly identifier: string;
  readonly msisdn: string;
  readonly roleId?: string;
  readonly password: string;
  readonly accountType: string;
  readonly organizationId?: string;
  readonly avatar?: string;
}

export interface LoginPayload {
  readonly identifier: string;
  readonly password: string;
  readonly userAgent?: string;
  readonly ipAddress?: string;
}

export interface RefreshTokenPayload {
  readonly refreshToken: string;
  readonly userAgent?: string;
  readonly ipAddress?: string;
}

export interface GetMePayload {
  readonly context: AuthContext;
}

export interface UpdatePasswordPayload {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly context: AuthContext;
}

export interface RequestPasswordResetPayload {
  readonly identifier: string;
}

export interface ResetPasswordPayload {
  readonly identifier: string;
  readonly otpCode: string;
  readonly newPassword: string;
}

export interface RequestOtpPayload {
  readonly identifier: string;
  readonly accountType: string;
}

export interface VerifyOtpPayload {
  readonly identifier: string;
  readonly otpCode: string;
  readonly userAgent?: string;
  readonly ipAddress?: string;
}

export interface GoogleCallbackPayload {
  readonly googleId: string;
  readonly email?: string;
  readonly name: string;
  readonly avatar?: string;
}

export interface ListSessionsPayload {
  readonly context: AuthContext;
}

export interface RevokeSessionPayload {
  readonly sessionId: string;
  readonly context: AuthContext;
}

export interface RevokeAllSessionsPayload {
  readonly context: AuthContext;
}

export interface SendEmailVerificationPayload {
  readonly context: AuthContext;
}

export interface VerifyEmailPayload {
  readonly otpCode: string;
  readonly context: AuthContext;
}

export interface SwitchOrgPayload {
  readonly organizationId: string;
  readonly context: AuthContext;
}
