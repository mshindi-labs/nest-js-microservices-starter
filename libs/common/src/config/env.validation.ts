import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  Min,
  validateSync,
} from 'class-validator';

enum DbAdapter {
  PG = 'pg',
  NEON = 'neon',
}

class EnvironmentVariables {
  @IsInt()
  @Min(1)
  PORT: number;

  // ─── Auth ────────────────────────────────────────────────────────────────────

  @IsString()
  @IsNotEmpty()
  X_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  CLIENT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  // ─── Google OAuth ────────────────────────────────────────────────────────────

  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_SECRET: string;

  @IsUrl({ require_tld: false })
  GOOGLE_CALLBACK_URL: string;

  @IsUrl({ require_tld: false })
  FRONTEND_AUTH_CALLBACK_URL: string;

  // ─── Database ────────────────────────────────────────────────────────────────

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsNumber()
  @Min(1)
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_USER: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_DATABASE: string;

  @IsEnum(DbAdapter)
  DB_ADAPTER: DbAdapter;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('\n  ');

    throw new Error(`Environment validation failed:\n  ${messages}`);
  }

  return validated;
}
