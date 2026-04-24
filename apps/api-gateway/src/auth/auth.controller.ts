import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Patch,
  Get,
  Delete,
  UseGuards,
  Req,
  Res,
  Inject,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from './guards/public.decorator';
import { Open } from './guards/open.decorator';
import { GoogleAuthGuard } from './guards';
import { User } from '@app/common/decorators/user.decorator';
import type { AuthorizedUser } from '@app/common/types/authenticated-request';
import { OkResponseDto } from '@app/common/dto';
import { FRONTEND_AUTH_CALLBACK_URL } from '@app/common/constants';
import { AUTH_PATTERNS, AUTH_SERVICE } from '@app/contracts';
import type { SignupDto } from './dto/signup.dto';
import type { LoginDto } from './dto/login.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import type { UpdatePasswordDto } from './dto/update-password.dto';
import type {
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto/reset-password.dto';
import type { RequestOtpDto } from './dto/request-otp.dto';
import type { VerifyOtpDto } from './dto/verify-otp.dto';
import type { SwitchOrgDto } from './dto/switch-org.dto';
import {
  AuthResponseDto,
  CurrentUserResponseDto,
} from './dto/auth-response.dto';
import { SessionResponseDto } from './dto/session-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AUTH_SERVICE) private readonly authClient: ClientProxy) {}

  @Public()
  @Throttle({ long: { limit: 10, ttl: 60_000 } })
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Signup a new user' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  signup(@Body() dto: SignupDto): Promise<AuthResponseDto> {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.SIGNUP, dto));
  }

  @Public()
  @Throttle({ long: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.LOGIN, {
        ...dto,
        userAgent: req.headers['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
      }),
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.REFRESH, {
        ...dto,
        userAgent: req.headers['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
      }),
    );
  }

  @ApiBearerAuth('access-token')
  @Patch('password/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a user password' })
  @ApiResponse({ status: 200, type: OkResponseDto })
  async updatePassword(
    @User() user: AuthorizedUser,
    @Body() dto: UpdatePasswordDto,
  ): Promise<OkResponseDto> {
    await firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.PASSWORD_UPDATE, {
        ...dto,
        context: user,
      }),
    );
    return { message: 'Password updated successfully' };
  }

  @Public()
  @Throttle({ long: { limit: 3, ttl: 3_600_000 } })
  @Post('password/reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset' })
  @ApiResponse({ status: 200, type: OkResponseDto })
  requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<OkResponseDto> {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.PASSWORD_RESET_REQUEST, dto),
    );
  }

  @Public()
  @Patch('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a user password' })
  @ApiResponse({ status: 200, type: OkResponseDto })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<OkResponseDto> {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.PASSWORD_RESET, dto),
    );
  }

  @Public()
  @Throttle({ long: { limit: 3, ttl: 600_000 } })
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request an OTP for login' })
  @ApiResponse({ status: 200, type: OkResponseDto })
  requestOtp(@Body() dto: RequestOtpDto): Promise<OkResponseDto> {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.OTP_REQUEST, dto));
  }

  @Public()
  @Throttle({ long: { limit: 3, ttl: 600_000 } })
  @Post('otp/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP, invalidating the existing one' })
  @ApiResponse({ status: 200, type: OkResponseDto })
  resendOtp(@Body() dto: RequestOtpDto): Promise<OkResponseDto> {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.OTP_RESEND, dto));
  }

  @Public()
  @Throttle({ long: { limit: 5, ttl: 600_000 } })
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and login' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.OTP_VERIFY, {
        ...dto,
        userAgent: req.headers['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
      }),
    );
  }

  @ApiBearerAuth('access-token')
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current authenticated user and account details',
  })
  @ApiResponse({ status: 200, type: CurrentUserResponseDto })
  getCurrentUser(
    @User() user: AuthorizedUser,
  ): Promise<CurrentUserResponseDto> {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.ME, { context: user }),
    );
  }

  @ApiBearerAuth('access-token')
  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active sessions for the current user' })
  @ApiResponse({ status: 200, type: [SessionResponseDto] })
  listSessions(@User() user: AuthorizedUser): Promise<SessionResponseDto[]> {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.LIST_SESSIONS, { context: user }),
    );
  }

  @ApiBearerAuth('access-token')
  @Delete('sessions/:session_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, type: OkResponseDto })
  async revokeSession(
    @User() user: AuthorizedUser,
    @Param('session_id', ParseUUIDPipe) sessionId: string,
  ): Promise<OkResponseDto> {
    await firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.REVOKE_SESSION, {
        sessionId,
        context: user,
      }),
    );
    return { message: 'Session revoked successfully' };
  }

  @ApiBearerAuth('access-token')
  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all sessions for the current user' })
  @ApiResponse({ status: 200, type: OkResponseDto })
  async revokeAllSessions(@User() user: AuthorizedUser): Promise<OkResponseDto> {
    await firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.REVOKE_ALL_SESSIONS, { context: user }),
    );
    return { message: 'All sessions revoked successfully' };
  }

  @ApiBearerAuth('access-token')
  @Throttle({ long: { limit: 3, ttl: 600_000 } })
  @Post('email/verification/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send email verification OTP' })
  @ApiResponse({ status: 200, type: OkResponseDto })
  sendEmailVerification(@User() user: AuthorizedUser): Promise<OkResponseDto> {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.SEND_EMAIL_VERIFICATION, {
        context: user,
      }),
    );
  }

  @ApiBearerAuth('access-token')
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with OTP code' })
  @ApiResponse({ status: 200, type: OkResponseDto })
  verifyEmail(
    @User() user: AuthorizedUser,
    @Body('otpCode') otpCode: string,
  ): Promise<OkResponseDto> {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.VERIFY_EMAIL, {
        otpCode,
        context: user,
      }),
    );
  }

  @ApiBearerAuth('access-token')
  @Post('org/switch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch active organization context' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  switchOrganization(
    @User() user: AuthorizedUser,
    @Body() dto: SwitchOrgDto,
  ): Promise<AuthResponseDto> {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.SWITCH_ORG, {
        ...dto,
        context: user,
      }),
    );
  }

  @Get('google')
  @Open()
  @SkipThrottle()
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  googleLogin(): void {
    // Passport handles the redirect to Google
  }

  @Get('google/callback')
  @Open()
  @SkipThrottle()
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback — redirects to frontend' })
  googleCallback(
    @Req() req: Request & { user: AuthResponseDto },
    @Res() res: Response,
  ): void {
    const { accessToken, refreshToken } = req.user;
    const fragment = `accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`;
    res.redirect(`${FRONTEND_AUTH_CALLBACK_URL}#${fragment}`);
  }
}
