import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { OTP, OTPType } from 'generated/prisma/client';
import { raiseHttpError } from '@app/common/utils/raise-http-error';

export interface CreateOtpData {
  accountId: string;
  code: string;
  type: OTPType;
  expiresAt: Date;
}

@Injectable()
export class OtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOtpData): Promise<OTP> {
    try {
      return await this.prisma.oTP.create({ data });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async markAsUsed(otpId: string): Promise<OTP> {
    try {
      return await this.prisma.oTP.update({
        where: { id: otpId },
        data: { isUsed: true },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async deleteExpiredOtps(): Promise<number> {
    try {
      const result = await this.prisma.oTP.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      return result.count;
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async deleteByAccountId(accountId: string): Promise<number> {
    try {
      const result = await this.prisma.oTP.deleteMany({
        where: { accountId },
      });
      return result.count;
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async findAllValidOtpsByAccountAndType(
    accountId: string,
    type: OTPType,
  ): Promise<OTP[]> {
    try {
      return await this.prisma.oTP.findMany({
        where: {
          accountId,
          type,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async invalidateAllByAccountAndType(
    accountId: string,
    type: OTPType,
  ): Promise<number> {
    try {
      const result = await this.prisma.oTP.updateMany({
        where: {
          accountId,
          type,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        data: { isUsed: true },
      });
      return result.count;
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }
}
