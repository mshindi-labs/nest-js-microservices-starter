import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { AUTH_PATTERNS } from '@app/contracts/auth/auth.patterns';
import type {
  SignupPayload,
  LoginPayload,
  RefreshTokenPayload,
  GetMePayload,
  UpdatePasswordPayload,
  RequestPasswordResetPayload,
  ResetPasswordPayload,
  RequestOtpPayload,
  VerifyOtpPayload,
  GoogleCallbackPayload,
  ListSessionsPayload,
  RevokeSessionPayload,
  RevokeAllSessionsPayload,
  SendEmailVerificationPayload,
  VerifyEmailPayload,
  SwitchOrgPayload,
} from '@app/contracts/auth/auth.payloads';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(AUTH_PATTERNS.SIGNUP)
  signup(@Payload() payload: SignupPayload) {
    return this.authService.signup(payload as never);
  }

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  login(@Payload() payload: LoginPayload) {
    return this.authService.login(payload as never);
  }

  @MessagePattern(AUTH_PATTERNS.REFRESH)
  refresh(@Payload() payload: RefreshTokenPayload) {
    return this.authService.refreshAccessToken(payload as never);
  }

  @MessagePattern(AUTH_PATTERNS.ME)
  getMe(@Payload() payload: GetMePayload) {
    return this.authService.getCurrentUser(
      payload.context.userId,
      payload.context.accountId,
    );
  }

  @MessagePattern(AUTH_PATTERNS.PASSWORD_UPDATE)
  updatePassword(@Payload() payload: UpdatePasswordPayload) {
    return this.authService.updatePassword(
      payload.context.userId,
      payload.context.accountId,
      {
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      },
    );
  }

  @MessagePattern(AUTH_PATTERNS.PASSWORD_RESET_REQUEST)
  requestPasswordReset(@Payload() payload: RequestPasswordResetPayload) {
    return this.authService.requestPasswordReset({
      identifier: payload.identifier,
    });
  }

  @MessagePattern(AUTH_PATTERNS.PASSWORD_RESET)
  resetPassword(@Payload() payload: ResetPasswordPayload) {
    return this.authService.resetPassword(payload as never);
  }

  @MessagePattern(AUTH_PATTERNS.OTP_REQUEST)
  requestOtp(@Payload() payload: RequestOtpPayload) {
    return this.authService.requestOtp(payload as never);
  }

  @MessagePattern(AUTH_PATTERNS.OTP_RESEND)
  resendOtp(@Payload() payload: RequestOtpPayload) {
    return this.authService.resendOtp(payload as never);
  }

  @MessagePattern(AUTH_PATTERNS.OTP_VERIFY)
  verifyOtp(@Payload() payload: VerifyOtpPayload) {
    return this.authService.verifyOtp(payload as never);
  }

  @MessagePattern(AUTH_PATTERNS.GOOGLE_CALLBACK)
  googleCallback(@Payload() payload: GoogleCallbackPayload) {
    return this.authService.signInWithGoogle(payload);
  }

  @MessagePattern(AUTH_PATTERNS.LIST_SESSIONS)
  listSessions(@Payload() payload: ListSessionsPayload) {
    return this.authService.listSessions(payload.context.accountId);
  }

  @MessagePattern(AUTH_PATTERNS.REVOKE_SESSION)
  revokeSession(@Payload() payload: RevokeSessionPayload) {
    return this.authService.revokeSession(
      payload.context.accountId,
      payload.sessionId,
    );
  }

  @MessagePattern(AUTH_PATTERNS.REVOKE_ALL_SESSIONS)
  revokeAllSessions(@Payload() payload: RevokeAllSessionsPayload) {
    return this.authService.revokeAllSessions(payload.context.accountId);
  }

  @MessagePattern(AUTH_PATTERNS.SEND_EMAIL_VERIFICATION)
  sendEmailVerification(@Payload() payload: SendEmailVerificationPayload) {
    return this.authService.sendEmailVerification(payload.context.accountId);
  }

  @MessagePattern(AUTH_PATTERNS.VERIFY_EMAIL)
  verifyEmail(@Payload() payload: VerifyEmailPayload) {
    return this.authService.verifyEmail(
      payload.context.accountId,
      payload.otpCode,
    );
  }

  @MessagePattern(AUTH_PATTERNS.SWITCH_ORG)
  switchOrganization(@Payload() payload: SwitchOrgPayload) {
    return this.authService.switchOrganization(
      payload.context.userId,
      payload.context.accountId,
      payload.organizationId,
    );
  }
}
