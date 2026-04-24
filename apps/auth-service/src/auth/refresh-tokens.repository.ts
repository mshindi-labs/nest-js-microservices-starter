import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { RefreshToken } from 'generated/prisma/client';
import { raiseHttpError } from '@app/common/utils/raise-http-error';

export interface CreateRefreshTokenData {
  accountId: string;
  token: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    try {
      return await this.prisma.refreshToken.create({ data });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    try {
      return await this.prisma.refreshToken.findUnique({
        where: { token },
        include: { account: true },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async revokeToken(token: string): Promise<RefreshToken> {
    try {
      return await this.prisma.refreshToken.update({
        where: { token },
        data: { isRevoked: true },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async revokeAllTokensForAccount(accountId: string): Promise<void> {
    try {
      await this.prisma.refreshToken.updateMany({
        where: { accountId, isRevoked: false },
        data: { isRevoked: true },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async deleteExpiredTokens(): Promise<number> {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      return result.count;
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }
}
