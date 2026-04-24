# Documentation Index

This directory contains reference documentation for the NestJS microservices starter. All docs reflect the current microservices architecture: `api-gateway` (HTTP, port 9011) and `auth-service` (TCP, port 9012).

## Core Docs

| File                                                 | Purpose                                                                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [`getting-started.md`](getting-started.md)           | Prerequisites, environment setup, two-service startup, first request, troubleshooting                                |
| [`project-architecture.md`](project-architecture.md) | Monorepo layout, two-service diagram, libs design, request flow, module compositions, contracts library, DI patterns |
| [`api-reference.md`](api-reference.md)               | Full route catalog with HTTP method, path, guard level, and TCP message pattern used                                 |
| [`auth-and-security.md`](auth-and-security.md)       | Guards stack, JWT local validation, RpcExceptionFilter, Google OAuth through gateway, rate limiting                  |
| [`database-and-prisma.md`](database-and-prisma.md)   | Prisma library design, shared-DB pattern tradeoffs, migration workflow, query patterns                               |
| [`development-workflow.md`](development-workflow.md) | Multi-file edit order, adding endpoints, adding a new service, guard/access design, testing with mocked ClientProxy  |

## Quick Navigation

- **Starting the project for the first time** → [`getting-started.md`](getting-started.md)
- **Understanding how the two services connect** → [`project-architecture.md`](project-architecture.md)
- **Adding a new API endpoint** → [`development-workflow.md`](development-workflow.md#adding-a-new-endpoint)
- **Understanding guard behavior** → [`auth-and-security.md`](auth-and-security.md)
- **Database schema changes** → [`database-and-prisma.md`](database-and-prisma.md)
- **Finding the right route and its TCP pattern** → [`api-reference.md`](api-reference.md)
