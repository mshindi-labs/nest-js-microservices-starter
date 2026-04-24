-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('EMAIL', 'MSISDN', 'GOOGLE');

-- CreateEnum
CREATE TYPE "OTPType" AS ENUM ('EMAIL_VERIFICATION', 'MSISDN_VERIFICATION', 'LOGIN', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "auth_organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization_id" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_organization_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "invited_by" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT,
    "msisdn" TEXT,
    "password" TEXT,
    "account_type" "AccountType" NOT NULL,
    "google_id" TEXT,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_msisdn_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_otp_codes" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "OTPType" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_invitations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "invited_by" TEXT NOT NULL,
    "accepted_by" TEXT,
    "accepted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_refresh_tokens" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "device_name" TEXT,
    "last_used_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_roles_organization_id_idx" ON "auth_roles"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_roles_name_organization_id_key" ON "auth_roles"("name", "organization_id");

-- CreateIndex
CREATE INDEX "auth_organization_memberships_user_id_idx" ON "auth_organization_memberships"("user_id");

-- CreateIndex
CREATE INDEX "auth_organization_memberships_organization_id_idx" ON "auth_organization_memberships"("organization_id");

-- CreateIndex
CREATE INDEX "auth_organization_memberships_role_id_idx" ON "auth_organization_memberships"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_organization_memberships_user_id_organization_id_key" ON "auth_organization_memberships"("user_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_accounts_email_key" ON "auth_accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_accounts_msisdn_key" ON "auth_accounts"("msisdn");

-- CreateIndex
CREATE UNIQUE INDEX "auth_accounts_google_id_key" ON "auth_accounts"("google_id");

-- CreateIndex
CREATE INDEX "auth_otp_codes_account_id_idx" ON "auth_otp_codes"("account_id");

-- CreateIndex
CREATE INDEX "auth_otp_codes_account_id_type_idx" ON "auth_otp_codes"("account_id", "type");

-- CreateIndex
CREATE INDEX "auth_otp_codes_expires_at_idx" ON "auth_otp_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_invitations_token_key" ON "auth_invitations"("token");

-- CreateIndex
CREATE INDEX "auth_invitations_organization_id_idx" ON "auth_invitations"("organization_id");

-- CreateIndex
CREATE INDEX "auth_invitations_email_idx" ON "auth_invitations"("email");

-- CreateIndex
CREATE INDEX "auth_invitations_token_idx" ON "auth_invitations"("token");

-- CreateIndex
CREATE INDEX "auth_invitations_status_idx" ON "auth_invitations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "auth_invitations_email_organization_id_status_key" ON "auth_invitations"("email", "organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "auth_refresh_tokens_token_key" ON "auth_refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "auth_refresh_tokens_account_id_idx" ON "auth_refresh_tokens"("account_id");

-- CreateIndex
CREATE INDEX "auth_refresh_tokens_token_idx" ON "auth_refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "auth_refresh_tokens_expires_at_idx" ON "auth_refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "auth_refresh_tokens_is_revoked_idx" ON "auth_refresh_tokens"("is_revoked");

-- AddForeignKey
ALTER TABLE "auth_roles" ADD CONSTRAINT "auth_roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "auth_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_organization_memberships" ADD CONSTRAINT "auth_organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_organization_memberships" ADD CONSTRAINT "auth_organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "auth_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_organization_memberships" ADD CONSTRAINT "auth_organization_memberships_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "auth_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_otp_codes" ADD CONSTRAINT "auth_otp_codes_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "auth_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_invitations" ADD CONSTRAINT "auth_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "auth_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_invitations" ADD CONSTRAINT "auth_invitations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "auth_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_refresh_tokens" ADD CONSTRAINT "auth_refresh_tokens_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "auth_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
