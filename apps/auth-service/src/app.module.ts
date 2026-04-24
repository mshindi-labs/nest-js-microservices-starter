import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '@app/common/config/env.validation';
import { CommonModule } from '@app/common';
import { PrismaModule } from '@app/prisma';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    CommonModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
  ],
})
export class AppModule {}
