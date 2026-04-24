import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { DATABASE_URL, DB_ADAPTER } from '@app/common/constants';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const connectionOptions = {
      connectionString: DATABASE_URL,
    };

    const adapter =
      DB_ADAPTER === 'neon'
        ? new PrismaNeon(connectionOptions)
        : new PrismaPg(connectionOptions);
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to the database');
    } catch (error) {
      this.logger.error(error);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (error) {
      this.logger.error(error);
    }
  }
}
