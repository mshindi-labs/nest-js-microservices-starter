import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import {
  AccountType,
  User,
  Roles,
  Organization,
  OrganizationMembership,
} from 'generated/prisma/client';
import { raiseHttpError } from '@app/common/utils/raise-http-error';
import {
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
} from '@app/common/constants';

export interface CreateAccountData {
  userId: string;
  email?: string;
  msisdn?: string;
  password?: string;
  googleId?: string;
  accountType: AccountType;
}

export interface AccountWithUser {
  id: string;
  userId: string;
  email: string | null;
  msisdn: string | null;
  password: string | null;
  googleId: string | null;
  accountType: AccountType;
  isEmailVerified: boolean;
  isMsisdnVerified: boolean;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: User & {
    memberships: (OrganizationMembership & {
      role: Roles;
      organization: Organization;
    })[];
  };
}

const USER_WITH_MEMBERSHIPS_INCLUDE = {
  user: {
    include: {
      memberships: {
        where: { deletedAt: null, isActive: true },
        include: { role: true, organization: true },
        orderBy: { joinedAt: 'asc' as const },
      },
    },
  },
} as const;

@Injectable()
export class AccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(
    email: string,
    throwWhenNotFound = true,
  ): Promise<AccountWithUser | null> {
    try {
      const account = await this.prisma.account.findUnique({
        where: { email },
        include: USER_WITH_MEMBERSHIPS_INCLUDE,
      });

      if (throwWhenNotFound && !account) {
        throw new NotFoundException(`Account with email ${email} not found`);
      }
      return account as AccountWithUser | null;
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findByMsisdn(
    msisdn: string,
    throwWhenNotFound = true,
  ): Promise<AccountWithUser | null> {
    try {
      const account = await this.prisma.account.findUnique({
        where: { msisdn },
        include: USER_WITH_MEMBERSHIPS_INCLUDE,
      });

      if (throwWhenNotFound && !account) {
        throw new NotFoundException(`Account with msisdn ${msisdn} not found`);
      }
      return account as AccountWithUser | null;
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findById(
    id: string,
    throwWhenNotFound = true,
  ): Promise<AccountWithUser | null> {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id },
        include: USER_WITH_MEMBERSHIPS_INCLUDE,
      });

      if (throwWhenNotFound && !account) {
        throw new NotFoundException(`Account with id ${id} not found`);
      }
      return account as AccountWithUser | null;
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findByGoogleId(
    googleId: string,
    throwWhenNotFound = false,
  ): Promise<AccountWithUser | null> {
    try {
      const account = await this.prisma.account.findUnique({
        where: { googleId },
        include: USER_WITH_MEMBERSHIPS_INCLUDE,
      });

      if (throwWhenNotFound && !account) {
        throw new NotFoundException(
          `Account with googleId ${googleId} not found`,
        );
      }
      return account as AccountWithUser | null;
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findByUserId(
    userId: string,
    throwWhenNotFound = true,
  ): Promise<AccountWithUser[]> {
    try {
      const accounts = await this.prisma.account.findMany({
        where: { userId },
        include: USER_WITH_MEMBERSHIPS_INCLUDE,
      });

      if (throwWhenNotFound && !accounts) {
        throw new NotFoundException(
          `Accounts with user id ${userId} not found`,
        );
      }
      return accounts as AccountWithUser[];
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async create(data: CreateAccountData): Promise<AccountWithUser> {
    try {
      const account = await this.prisma.account.create({
        data,
        include: USER_WITH_MEMBERSHIPS_INCLUDE,
      });
      return account as AccountWithUser;
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async updatePassword(
    accountId: string,
    hashedPassword: string,
  ): Promise<AccountWithUser> {
    try {
      const account = await this.prisma.account.update({
        where: { id: accountId },
        data: { password: hashedPassword },
        include: USER_WITH_MEMBERSHIPS_INCLUDE,
      });

      if (!account) {
        throw new NotFoundException(`Account with id ${accountId} not found`);
      }

      return account as AccountWithUser;
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async update(
    accountId: string,
    data: {
      email?: string;
      password?: string;
      accountType?: AccountType;
      googleId?: string;
    },
  ): Promise<AccountWithUser> {
    try {
      const account = await this.prisma.account.update({
        where: { id: accountId },
        data,
        include: USER_WITH_MEMBERSHIPS_INCLUDE,
      });
      return account as AccountWithUser;
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async updateLastLoginAt(accountId: string): Promise<void> {
    await this.prisma.account.update({
      where: { id: accountId },
      data: { lastLoginAt: new Date() },
    });
  }

  async incrementFailedLoginAttempts(accountId: string): Promise<void> {
    const updated = await this.prisma.account.update({
      where: { id: accountId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    if (updated.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(
        lockedUntil.getMinutes() + LOCKOUT_DURATION_MINUTES,
      );
      await this.prisma.account.update({
        where: { id: accountId },
        data: { lockedUntil },
      });
    }
  }

  async resetFailedLoginAttempts(accountId: string): Promise<void> {
    await this.prisma.account.update({
      where: { id: accountId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  async updateVerificationStatus(
    accountId: string,
    type: 'email' | 'msisdn',
    verified: boolean,
  ): Promise<AccountWithUser> {
    try {
      const updateData =
        type === 'email'
          ? { isEmailVerified: verified }
          : { isMsisdnVerified: verified };

      const account = await this.prisma.account.update({
        where: { id: accountId },
        data: updateData,
        include: USER_WITH_MEMBERSHIPS_INCLUDE,
      });

      if (!account) {
        throw new NotFoundException(`Account with id ${accountId} not found`);
      }

      return account as AccountWithUser;
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }
}
