## 1.0.0 (2026-04-24)

### ⚠ BREAKING CHANGES

- **auth:** User, Organization, and Role IDs are now UUIDs; routes that
  previously accepted integer :user_id params now use ParseUUIDPipe and return
  400 for non-UUID values. JWT access tokens expire in 15 minutes instead of
  7 days — clients must implement refresh-token rotation.

Migration: pnpm prisma migrate dev --name auth-foundation && pnpm prisma generate

### Features

- **auth:** multi-org membership, auth hardening, and org scalability ([cc87be4](https://github.com/mshindi-labs/nest-js-microservices-starter/commit/cc87be46f6de6b869e3acd0a35290e100d1e7e33))

## 1.0.0 (2026-03-19)

### Features

- Add new functional programming skills and related documentation for fp-ts patterns ([c6f18ac](https://github.com/mshindi-labs/nestjs-prisma-starter/commit/c6f18ac13ffd779bd886029a9b6048a3d21bc496))
- **core:** initialize NestJS app with Prisma, auth, and env setup ([9e7d1d3](https://github.com/mshindi-labs/nestjs-prisma-starter/commit/9e7d1d39aa957412d9cac5b951fff34323b88c32))
- **docs:** enhance documentation with comprehensive guides ([b451f8a](https://github.com/mshindi-labs/nestjs-prisma-starter/commit/b451f8a6293cb3518952b5ded7b13f82a0ee1997))
- Initialize NestJS starter project with integrated AI agent skills for NestJS best practices and functional TypeScript. ([25f47ac](https://github.com/mshindi-labs/nestjs-prisma-starter/commit/25f47ac75ed699606306b0a986a5ff322019adeb))
