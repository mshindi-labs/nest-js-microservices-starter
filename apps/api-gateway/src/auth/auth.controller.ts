import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Patch,
  Get,
  UseGuards,
  Req,
  Res,
  Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
import {
  AuthResponseDto,
  CurrentUserResponseDto,
} from './dto/auth-response.dto';

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
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.LOGIN, dto));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.REFRESH, dto));
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
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponseDto> {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.OTP_VERIFY, dto));
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
