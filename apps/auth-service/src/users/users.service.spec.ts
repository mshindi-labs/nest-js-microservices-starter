import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { PrismaService } from '@app/prisma';
import { PaginationService } from '@app/common/services/pagination/pagination.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;
  let prisma: jest.Mocked<PrismaService>;

  const USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const ROLE_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  const ORG_ID = 'c3d4e5f6-a7b8-9012-cdef-123456789012';

  const mockRole = {
    id: ROLE_ID,
    name: 'student',
    organizationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
  };

  const mockMembership = {
    id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
    userId: USER_ID,
    organizationId: ORG_ID,
    roleId: ROLE_ID,
    role: mockRole,
    organization: {
      id: ORG_ID,
      name: 'Test Org',
      description: null,
      logo: null,
      website: null,
      isActive: true,
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    isActive: true,
    invitedBy: null,
    joinedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: USER_ID,
    name: 'Test User',
    avatar: null,
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    memberships: [mockMembership],
    accounts: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByRoleId: jest.fn(),
            findByOrganizationId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            roles: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
            },
            organization: {
              findUnique: jest.fn(),
            },
            organizationMembership: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              upsert: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            account: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn((fn: (tx: unknown) => unknown) =>
              fn({
                user: {
                  create: jest.fn().mockResolvedValue(mockUser),
                  update: jest.fn(),
                  findUnique: jest.fn().mockResolvedValue(mockUser),
                },
                account: { update: jest.fn() },
                organizationMembership: {
                  create: jest.fn(),
                  upsert: jest.fn(),
                  update: jest.fn(),
                },
              }),
            ),
          },
        },
        PaginationService,
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(UsersRepository);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      repository.findById.mockResolvedValue(mockUser as never);

      const result = await service.findById(USER_ID);

      expect(result).toEqual(mockUser);
      expect(repository.findById).toHaveBeenCalledWith(USER_ID);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should use default role when roleId not provided', async () => {
      const createDto = { name: 'New User' };
      (prisma.roles.findFirst as jest.Mock).mockResolvedValue(mockRole);

      await service.create(createDto);

      expect(prisma.roles.findFirst).toHaveBeenCalledWith({
        where: { name: 'other', organizationId: null },
      });
    });

    it('should throw BadRequestException when default role not found', async () => {
      const createDto = { name: 'New User' };
      (prisma.roles.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when provided roleId does not exist', async () => {
      const createDto = { name: 'New User', roleId: 'non-existent-uuid' };
      (prisma.roles.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when provided organizationId does not exist', async () => {
      const createDto = {
        name: 'New User',
        roleId: ROLE_ID,
        organizationId: 'non-existent-uuid',
      };
      (prisma.roles.findUnique as jest.Mock).mockResolvedValue(mockRole);
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update('non-existent-uuid', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete user', async () => {
      repository.findById.mockResolvedValue(mockUser as never);
      repository.delete.mockResolvedValue(undefined);

      await service.remove(USER_ID);

      expect(repository.delete).toHaveBeenCalledWith(USER_ID);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
