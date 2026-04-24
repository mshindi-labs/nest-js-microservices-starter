import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AccountsRepository, AccountWithUser } from './accounts.repository';
import { OtpRepository } from './otp.repository';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  AuthResponseDto,
  CurrentUserResponseDto,
} from './dto/auth-response.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import type { JwtPayload } from '@app/contracts';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AccountType, OTP, OTPType } from 'generated/prisma/client';
import { AuthorizedUser } from '@app/common/types/authenticated-request';
import { raiseHttpError } from '@app/common/utils/raise-http-error';
import { normalizeMsisdn } from '@app/common/utils/functions';
import {
  BCRYPT_ROUNDS,
  REFRESH_TOKEN_EXPIRES_IN_DAYS,
  OTP_DIGITS,
  OTP_EXPIRY_MINUTES,
} from '@app/common/constants';

interface SessionOptions {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptRounds: number = BCRYPT_ROUNDS;
  private readonly refreshTokenExpiresInDays: number =
    REFRESH_TOKEN_EXPIRES_IN_DAYS;

  constructor(
    private readonly accountsRepository: AccountsRepository,
    private readonly otpRepository: OtpRepository,
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  private buildJwtPayload(account: AccountWithUser): JwtPayload {
    const memberships = account.user.memberships ?? [];
    const activeMembership = memberships[0] ?? null;
    return {
      sub: account.userId,
      accountId: account.id,
      jti: crypto.randomUUID(),
      name: account.user.name,
      roleId: activeMembership?.roleId ?? '',
      roleName: activeMembership?.role?.name ?? '',
      organizationId: activeMembership?.organizationId ?? null,
      ...(account.email ? { email: account.email } : {}),
      ...(account.msisdn ? { msisdn: account.msisdn } : {}),
    };
  }

  private buildJwtPayloadWithOrgContext(
    account: AccountWithUser,
    organizationId: string | null,
  ): JwtPayload {
    const memberships = account.user.memberships ?? [];
    const activeMembership = organizationId
      ? (memberships.find(m => m.organizationId === organizationId) ?? memberships[0] ?? null)
      : (memberships[0] ?? null);
    return {
      sub: account.userId,
      accountId: account.id,
      jti: crypto.randomUUID(),
      name: account.user.name,
      roleId: activeMembership?.roleId ?? '',
      roleName: activeMembership?.role?.name ?? '',
      organizationId: activeMembership?.organizationId ?? null,
      ...(account.email ? { email: account.email } : {}),
      ...(account.msisdn ? { msisdn: account.msisdn } : {}),
    };
  }

  private generateOtpCode(): string {
    const min = Math.pow(10, OTP_DIGITS - 1);
    const max = Math.pow(10, OTP_DIGITS) - 1;
    return crypto.randomInt(min, max).toString();
  }

  private async createRefreshToken(
    accountId: string,
    session: SessionOptions = {},
  ): Promise<string> {
    const token = this.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenExpiresInDays);

    await this.refreshTokensRepository.create({
      accountId,
      token,
      expiresAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
    });

    return token;
  }

  async signup(dto: SignupDto): Promise<AuthResponseDto> {
    try {
      const normalizedMsisdn = normalizeMsisdn(dto.msisdn);

      const existingByIdentifier =
        dto.accountType === AccountType.EMAIL
          ? await this.accountsRepository.findByEmail(dto.identifier, false)
          : await this.accountsRepository.findByMsisdn(normalizedMsisdn, false);

      if (existingByIdentifier) {
        throw new ConflictException(
          `${dto.accountType === AccountType.EMAIL ? 'Email' : 'Phone number'} already in use`,
        );
      }

      if (dto.accountType === AccountType.EMAIL) {
        const existingByMsisdn = await this.accountsRepository.findByMsisdn(
          normalizedMsisdn,
          false,
        );
        if (existingByMsisdn) {
          if (existingByMsisdn.email) {
            throw new ConflictException('Phone number already in use');
          }
          const hashedPassword = await bcrypt.hash(
            dto.password,
            Number(this.bcryptRounds),
          );
          await this.usersService.update(existingByMsisdn.userId, {
            name: dto.name,
            avatar: dto.avatar,
            organizationId: dto.organizationId,
            roleId: dto.roleId,
          });
          const account = await this.accountsRepository.update(
            existingByMsisdn.id,
            {
              email: dto.identifier,
              password: hashedPassword,
              accountType: AccountType.EMAIL,
            },
          );

          const payload = this.buildJwtPayload(account);
          const accessToken = this.jwtService.sign(payload);
          const refreshToken = await this.createRefreshToken(account.id);

          return {
            accessToken,
            refreshToken,
            user: account.user as never,
          };
        }
      }

      const hashedPassword = await bcrypt.hash(
        dto.password,
        Number(this.bcryptRounds),
      );

      const user = await this.usersService.create({
        name: dto.name,
        avatar: dto.avatar,
        organizationId: dto.organizationId,
        roleId: dto.roleId,
      });

      const accountData =
        dto.accountType === AccountType.EMAIL
          ? { email: dto.identifier, msisdn: normalizedMsisdn }
          : { msisdn: normalizedMsisdn };

      const account = await this.accountsRepository.create({
        userId: user.id,
        ...accountData,
        password: hashedPassword,
        accountType: dto.accountType,
      });

      const payload = this.buildJwtPayload(account);
      const accessToken = this.jwtService.sign(payload);
      const refreshToken = await this.createRefreshToken(account.id);

      return {
        accessToken,
        refreshToken,
        user: account.user as never,
      };
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async login(
    dto: LoginDto,
    session: SessionOptions = {},
  ): Promise<AuthResponseDto> {
    try {
      const isEmail = dto.identifier.includes('@');
      const identifier = isEmail
        ? dto.identifier
        : normalizeMsisdn(dto.identifier);
      const account = isEmail
        ? await this.accountsRepository.findByEmail(identifier)
        : await this.accountsRepository.findByMsisdn(identifier);

      if (!account) {
        throw new UnauthorizedException('Invalid credentials');
      }

      if (account.lockedUntil && account.lockedUntil <= new Date()) {
        await this.accountsRepository.resetFailedLoginAttempts(account.id);
        account.lockedUntil = null;
        account.failedLoginAttempts = 0;
      }

      if (account.lockedUntil && account.lockedUntil > new Date()) {
        throw new UnauthorizedException(
          'Too many failed attempts. Try again later.',
        );
      }

      if (!account.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }

      if (!account.password) {
        throw new UnauthorizedException('Password not set for this account');
      }

      const isPasswordValid = await bcrypt.compare(
        dto.password,
        account.password,
      );
      if (!isPasswordValid) {
        await this.accountsRepository.incrementFailedLoginAttempts(account.id);
        throw new UnauthorizedException('Invalid credentials');
      }

      await this.accountsRepository.resetFailedLoginAttempts(account.id);
      await this.accountsRepository.updateLastLoginAt(account.id);

      const payload = this.buildJwtPayload(account);
      const accessToken = this.jwtService.sign(payload);
      const refreshToken = await this.createRefreshToken(account.id, session);

      return {
        accessToken,
        refreshToken,
        user: account.user as never,
      };
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async refreshAccessToken(
    dto: RefreshTokenDto,
    session: SessionOptions = {},
  ): Promise<AuthResponseDto> {
    try {
      const refreshTokenRecord = await this.refreshTokensRepository.findByToken(
        dto.refreshToken,
      );

      if (!refreshTokenRecord) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (refreshTokenRecord.isRevoked) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      if (refreshTokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      const account = await this.accountsRepository.findById(
        refreshTokenRecord.accountId,
      );

      if (!account) {
        throw new NotFoundException('Account not found');
      }

      if (!account.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }

      await this.refreshTokensRepository.updateLastUsedAt(refreshTokenRecord.id);
      await this.refreshTokensRepository.revokeToken(dto.refreshToken);

      const payload = this.buildJwtPayload(account);
      const accessToken = this.jwtService.sign(payload);
      const newRefreshToken = await this.createRefreshToken(account.id, session);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user: account.user as never,
      };
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async updatePassword(
    userId: string,
    accountId: string,
    dto: UpdatePasswordDto,
  ): Promise<void> {
    try {
      const account = await this.accountsRepository.findById(accountId);
      if (!account || account.userId !== userId) {
        throw new NotFoundException('Account not found');
      }

      if (
        account.accountType === AccountType.EMAIL &&
        !account.isEmailVerified
      ) {
        throw new ForbiddenException(
          'Email must be verified before changing your password',
        );
      }

      if (!account.password) {
        throw new BadRequestException('Password not set for this account');
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        dto.currentPassword,
        account.password,
      );
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      const hashedPassword = await bcrypt.hash(
        dto.newPassword,
        this.bcryptRounds,
      );

      await this.accountsRepository.updatePassword(accountId, hashedPassword);
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async requestPasswordReset(
    dto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    try {
      const isEmail = dto.identifier.includes('@');
      const identifier = isEmail
        ? dto.identifier
        : normalizeMsisdn(dto.identifier);
      const account = isEmail
        ? await this.accountsRepository.findByEmail(identifier, false)
        : await this.accountsRepository.findByMsisdn(identifier, false);

      if (!account) {
        return { message: 'If the account exists, an OTP has been sent' };
      }

      await this.otpRepository.invalidateAllByAccountAndType(
        account.id,
        OTPType.PASSWORD_RESET,
      );

      const otpCode = this.generateOtpCode();
      const hashedOtp = await bcrypt.hash(otpCode, this.bcryptRounds);

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

      await this.otpRepository.create({
        accountId: account.id,
        code: hashedOtp,
        type: OTPType.PASSWORD_RESET,
        expiresAt,
      });

      this.logger.debug(`Password reset OTP generated for account ${account.id}`);

      return { message: 'If the account exists, an OTP has been sent' };
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    try {
      const isEmail = dto.identifier.includes('@');
      const identifier = isEmail
        ? dto.identifier
        : normalizeMsisdn(dto.identifier);
      const account = isEmail
        ? await this.accountsRepository.findByEmail(identifier, false)
        : await this.accountsRepository.findByMsisdn(identifier, false);

      if (!account) {
        throw new BadRequestException('Invalid OTP or account not found');
      }

      const validOtps = await this.otpRepository.findAllValidOtpsByAccountAndType(
        account.id,
        OTPType.PASSWORD_RESET,
      );

      let matchedOtp: OTP | null = null;
      for (const otp of validOtps) {
        const isMatch = await bcrypt.compare(dto.otpCode, otp.code);
        if (isMatch) {
          matchedOtp = otp;
          break;
        }
      }

      if (!matchedOtp) {
        throw new BadRequestException('Invalid or expired OTP');
      }

      await this.otpRepository.markAsUsed(matchedOtp.id);

      const hashedPassword = await bcrypt.hash(
        dto.newPassword,
        this.bcryptRounds,
      );

      await this.accountsRepository.updatePassword(account.id, hashedPassword);

      return { message: 'Password reset successfully' };
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async requestOtp(dto: RequestOtpDto): Promise<{ message: string }> {
    try {
      const identifier =
        dto.accountType === AccountType.MSISDN
          ? normalizeMsisdn(dto.identifier)
          : dto.identifier;

      let account =
        dto.accountType === AccountType.EMAIL
          ? await this.accountsRepository.findByEmail(identifier, false)
          : await this.accountsRepository.findByMsisdn(identifier, false);

      if (!account) {
        const user = await this.usersService.create({
          name: identifier,
          avatar: undefined,
          organizationId: undefined,
        });

        const accountData =
          dto.accountType === AccountType.EMAIL
            ? { email: identifier }
            : { msisdn: identifier };

        account = await this.accountsRepository.create({
          userId: user.id,
          ...accountData,
          password: undefined,
          accountType: dto.accountType,
        });
      }

      if (!account.isActive) {
        return { message: 'If the account exists, an OTP has been sent' };
      }

      await this.otpRepository.invalidateAllByAccountAndType(
        account.id,
        OTPType.LOGIN,
      );

      const otpCode = this.generateOtpCode();
      const hashedOtp = await bcrypt.hash(otpCode, this.bcryptRounds);

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

      await this.otpRepository.create({
        accountId: account.id,
        code: hashedOtp,
        type: OTPType.LOGIN,
        expiresAt,
      });

      return { message: 'If the account exists, an OTP has been sent' };
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async resendOtp(dto: RequestOtpDto): Promise<{ message: string }> {
    try {
      const identifier =
        dto.accountType === AccountType.MSISDN
          ? normalizeMsisdn(dto.identifier)
          : dto.identifier;

      const account =
        dto.accountType === AccountType.EMAIL
          ? await this.accountsRepository.findByEmail(identifier, false)
          : await this.accountsRepository.findByMsisdn(identifier, false);

      if (!account || !account.isActive) {
        return { message: 'If the account exists, an OTP has been sent' };
      }

      await this.otpRepository.invalidateAllByAccountAndType(
        account.id,
        OTPType.LOGIN,
      );

      const otpCode = this.generateOtpCode();
      const hashedOtp = await bcrypt.hash(otpCode, this.bcryptRounds);

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

      await this.otpRepository.create({
        accountId: account.id,
        code: hashedOtp,
        type: OTPType.LOGIN,
        expiresAt,
      });

      return { message: 'If the account exists, an OTP has been sent' };
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    session: SessionOptions = {},
  ): Promise<AuthResponseDto> {
    try {
      const isEmail = dto.identifier.includes('@');
      const identifier = isEmail
        ? dto.identifier
        : normalizeMsisdn(dto.identifier);
      const account = isEmail
        ? await this.accountsRepository.findByEmail(identifier)
        : await this.accountsRepository.findByMsisdn(identifier);

      if (!account) {
        throw new UnauthorizedException('Invalid OTP or account not found');
      }

      if (!account.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }

      const allValidOtps =
        await this.otpRepository.findAllValidOtpsByAccountAndType(
          account.id,
          OTPType.LOGIN,
        );

      let matchedOtp: OTP | null = null;
      for (const otp of allValidOtps) {
        const isMatch = await bcrypt.compare(dto.otpCode, otp.code);
        if (isMatch) {
          matchedOtp = otp;
          break;
        }
      }

      if (!matchedOtp) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      await this.otpRepository.markAsUsed(matchedOtp.id);
      await this.accountsRepository.updateLastLoginAt(account.id);

      const payload = this.buildJwtPayload(account);
      const accessToken = this.jwtService.sign(payload);
      const refreshToken = await this.createRefreshToken(account.id, session);

      return {
        accessToken,
        refreshToken,
        user: account.user as never,
      };
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async signInWithGoogle(data: {
    googleId: string;
    email?: string;
    name: string;
    avatar?: string;
  }): Promise<AuthResponseDto> {
    let account = await this.accountsRepository.findByGoogleId(data.googleId);

    if (!account && data.email) {
      account = await this.accountsRepository.findByEmail(data.email, false);
      if (account) {
        account = await this.accountsRepository.update(account.id, {
          googleId: data.googleId,
        });
      }
    }

    if (!account) {
      const user = await this.usersService.create({
        name: data.name,
        avatar: data.avatar,
        organizationId: undefined,
      });

      account = await this.accountsRepository.create({
        userId: user.id,
        email: data.email,
        googleId: data.googleId,
        accountType: AccountType.GOOGLE,
      });
    }

    if (!account.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    await this.accountsRepository.updateLastLoginAt(account.id);

    const payload = this.buildJwtPayload(account);
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(account.id);

    return {
      accessToken,
      refreshToken,
      user: account.user as never,
    };
  }

  async validateUser(payload: JwtPayload): Promise<AuthorizedUser> {
    try {
      const user = await this.usersService.findById(payload.sub);
      const account = await this.accountsRepository.findById(payload.accountId);

      if (!user || !account) {
        throw new UnauthorizedException('Invalid token');
      }

      const memberships =
        (user as unknown as { memberships?: { organizationId: string; roleId: string; role?: { name: string } }[] }).memberships ?? [];

      const activeMembership = payload.organizationId
        ? (memberships.find(m => m.organizationId === payload.organizationId) ??
          memberships[0] ??
          null)
        : (memberships[0] ?? null);

      return {
        userId: user.id,
        accountId: account.id,
        name: user.name,
        roleId: activeMembership?.roleId ?? '',
        roleName: activeMembership?.role?.name ?? '',
        organizationId: activeMembership?.organizationId ?? null,
        email: account.email || undefined,
        msisdn: account.msisdn || undefined,
      };
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async getCurrentUser(
    userId: string,
    accountId: string,
  ): Promise<CurrentUserResponseDto> {
    try {
      const account = await this.accountsRepository.findById(accountId);

      if (!account || account.userId !== userId) {
        throw new NotFoundException('Account not found');
      }

      if (!account.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _omit, ...accountWithoutPassword } = account;
      const memberships = account.user.memberships ?? [];
      const activeMembership = memberships[0];
      const user = {
        ...account.user,
        memberships,
      };

      return {
        ...accountWithoutPassword,
        user: user as never,
        role: activeMembership?.role
          ? {
              id: activeMembership.role.id,
              name: activeMembership.role.name,
              createdAt: activeMembership.role.createdAt,
              updatedAt: activeMembership.role.updatedAt,
            }
          : undefined,
      };
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async listSessions(accountId: string): Promise<SessionResponseDto[]> {
    try {
      const sessions =
        await this.refreshTokensRepository.findActiveByAccountId(accountId);
      return sessions.map((s) => ({
        id: s.id,
        userAgent: s.userAgent ?? null,
        ipAddress: s.ipAddress ?? null,
        deviceName: s.deviceName ?? null,
        lastUsedAt: s.lastUsedAt ?? null,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isRevoked: s.isRevoked,
      }));
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async revokeSession(accountId: string, sessionId: string): Promise<void> {
    try {
      await this.refreshTokensRepository.revokeById(sessionId, accountId);
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async revokeAllSessions(accountId: string): Promise<void> {
    try {
      await this.refreshTokensRepository.revokeAllTokensForAccount(accountId);
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async sendEmailVerification(accountId: string): Promise<{ message: string }> {
    try {
      const account = await this.accountsRepository.findById(accountId);

      if (!account) {
        throw new NotFoundException('Account not found');
      }

      if (account.accountType !== AccountType.EMAIL || !account.email) {
        throw new BadRequestException(
          'Email verification is only available for email accounts',
        );
      }

      if (account.isEmailVerified) {
        throw new ConflictException('Email is already verified');
      }

      await this.otpRepository.invalidateAllByAccountAndType(
        accountId,
        OTPType.EMAIL_VERIFICATION,
      );

      const otpCode = this.generateOtpCode();
      const hashedOtp = await bcrypt.hash(otpCode, this.bcryptRounds);

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

      await this.otpRepository.create({
        accountId,
        code: hashedOtp,
        type: OTPType.EMAIL_VERIFICATION,
        expiresAt,
      });

      this.logger.debug(`Email verification OTP generated for account ${accountId}`);

      return { message: 'If the account exists, a verification OTP has been sent' };
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async verifyEmail(
    accountId: string,
    otpCode: string,
  ): Promise<{ message: string }> {
    try {
      const validOtps = await this.otpRepository.findAllValidOtpsByAccountAndType(
        accountId,
        OTPType.EMAIL_VERIFICATION,
      );

      let matchedOtp: OTP | null = null;
      for (const otp of validOtps) {
        const isMatch = await bcrypt.compare(otpCode, otp.code);
        if (isMatch) {
          matchedOtp = otp;
          break;
        }
      }

      if (!matchedOtp) {
        throw new BadRequestException('Invalid or expired OTP');
      }

      await this.otpRepository.markAsUsed(matchedOtp.id);
      await this.accountsRepository.updateVerificationStatus(
        accountId,
        'email',
        true,
      );

      return { message: 'Email verified successfully' };
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async switchOrganization(
    userId: string,
    accountId: string,
    targetOrgId: string,
  ): Promise<AuthResponseDto> {
    try {
      const account = await this.accountsRepository.findById(accountId);

      if (!account || account.userId !== userId) {
        throw new NotFoundException('Account not found');
      }

      if (!account.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }

      const memberships = account.user.memberships ?? [];
      const targetMembership = memberships.find(
        m => m.organizationId === targetOrgId,
      );

      if (!targetMembership) {
        throw new ForbiddenException(
          'You do not have an active membership in the requested organization',
        );
      }

      const payload = this.buildJwtPayloadWithOrgContext(account, targetOrgId);
      const accessToken = this.jwtService.sign(payload);
      const refreshToken = await this.createRefreshToken(accountId);

      return {
        accessToken,
        refreshToken,
        user: account.user as never,
      };
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }
}
