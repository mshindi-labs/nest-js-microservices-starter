export interface JwtPayload {
  sub: number;
  accountId: string;
  name: string;
  roleId: number;
  roleName: string;
  organizationId: number | null;
  email?: string;
  msisdn?: string;
  iat?: number;
  exp?: number;
}

export interface AuthContext {
  readonly userId: number;
  readonly accountId: string;
  readonly name: string;
  readonly roleId: number;
  readonly roleName: string;
  readonly organizationId: number | null;
  readonly email?: string;
  readonly msisdn?: string;
}

export interface SignupPayload {
  readonly name: string;
  readonly identifier: string;
  readonly msisdn: string;
  readonly roleId: number;
  readonly password: string;
  readonly accountType: string;
  readonly organizationId?: number;
  readonly avatar?: string;
}

export interface LoginPayload {
  readonly identifier: string;
  readonly password: string;
}

export interface RefreshTokenPayload {
  readonly refreshToken: string;
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
}

export interface GoogleCallbackPayload {
  readonly googleId: string;
  readonly email?: string;
  readonly name: string;
  readonly avatar?: string;
}
