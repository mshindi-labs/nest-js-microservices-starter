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

  const mockUser = {
    id: 1,
    name: 'Test User',
    avatar: null,
    roleId: 1,
    organizationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: 1,
      name: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    organization: null,
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
            user: {
              findUnique: jest.fn(),
            },
            account: {
              findUnique: jest.fn(),
            },
            $transaction: jest.fn(),
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

      const result = await service.findById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(repository.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create user with provided roleId', async () => {
      const createDto = { name: 'New User', roleId: mockUser.roleId };
      (prisma.roles.findUnique as jest.Mock).mockResolvedValue(mockUser.role);
      repository.create.mockResolvedValue(mockUser as never);

      const result = await service.create(createDto);

      expect(result).toEqual(mockUser);
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('should use default role when roleId not provided', async () => {
      const createDto = { name: 'New User' };
      (prisma.roles.findFirst as jest.Mock).mockResolvedValue(mockUser.role);
      (prisma.roles.findUnique as jest.Mock).mockResolvedValue(mockUser.role);
      repository.create.mockResolvedValue(mockUser as never);

      await service.create(createDto);

      expect(prisma.roles.findFirst).toHaveBeenCalledWith({
        where: { name: 'other' },
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
      const createDto = { name: 'New User', roleId: 999 };
      (prisma.roles.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update user name', async () => {
      const updateDto = { name: 'Updated Name' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      repository.update.mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
      } as never);

      const result = await service.update(mockUser.id, updateDto);

      expect(result.name).toBe('Updated Name');
      expect(repository.update).toHaveBeenCalledWith(mockUser.id, updateDto);
    });

    it('should throw NotFoundException when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update(999, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      repository.findById.mockResolvedValue(mockUser as never);
      repository.delete.mockResolvedValue(undefined);

      await service.remove(mockUser.id);

      expect(repository.delete).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
