import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesRepository } from './roles.repository';
import { PaginationService } from '@app/common/services/pagination/pagination.service';

describe('RolesService', () => {
  let service: RolesService;
  let repository: jest.Mocked<RolesRepository>;

  const ROLE_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const ORG_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

  const mockOrgRole = {
    id: ROLE_ID,
    name: 'manager',
    organizationId: ORG_ID,
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSystemRole = {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    name: 'other',
    organizationId: null,
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: RolesRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByNameAndOrg: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            countMemberships: jest.fn(),
            countPendingInvitations: jest.fn(),
            count: jest.fn(),
          },
        },
        PaginationService,
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    repository = module.get(RolesRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return role when found and org matches', async () => {
      repository.findById.mockResolvedValue(mockOrgRole as never);

      const result = await service.findById(ROLE_ID, ORG_ID);

      expect(result).toEqual(mockOrgRole);
      expect(repository.findById).toHaveBeenCalledWith(ROLE_ID);
    });

    it('should return system role regardless of org context', async () => {
      repository.findById.mockResolvedValue(mockSystemRole as never);

      const result = await service.findById(mockSystemRole.id, ORG_ID);

      expect(result).toEqual(mockSystemRole);
    });

    it('should throw NotFoundException when role not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent', ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when role belongs to a different org', async () => {
      repository.findById.mockResolvedValue({
        ...mockOrgRole,
        organizationId: 'other-org',
      } as never);

      await expect(service.findById(ROLE_ID, ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create an org-scoped role', async () => {
      repository.findByNameAndOrg.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockOrgRole as never);

      const result = await service.create(
        { name: 'manager', organizationId: ORG_ID },
        'actor-id',
      );

      expect(repository.findByNameAndOrg).toHaveBeenCalledWith(
        'manager',
        ORG_ID,
      );
      expect(repository.create).toHaveBeenCalledWith({
        name: 'manager',
        organizationId: ORG_ID,
        createdBy: 'actor-id',
      });
      expect(result).toEqual(mockOrgRole);
    });

    it('should create a system role when organizationId is not provided', async () => {
      repository.findByNameAndOrg.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockSystemRole as never);

      await service.create({ name: 'other' }, 'actor-id');

      expect(repository.findByNameAndOrg).toHaveBeenCalledWith('other', null);
      expect(repository.create).toHaveBeenCalledWith({
        name: 'other',
        organizationId: null,
        createdBy: 'actor-id',
      });
    });

    it('should throw ConflictException when org role name already exists', async () => {
      repository.findByNameAndOrg.mockResolvedValue(mockOrgRole as never);

      await expect(
        service.create({ name: 'manager', organizationId: ORG_ID }, 'actor-id'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when system role name already exists', async () => {
      repository.findByNameAndOrg.mockResolvedValue(mockSystemRole as never);

      await expect(
        service.create({ name: 'other' }, 'actor-id'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update role name', async () => {
      repository.findById.mockResolvedValue(mockOrgRole as never);
      repository.findByNameAndOrg.mockResolvedValue(null);
      repository.update.mockResolvedValue({
        ...mockOrgRole,
        name: 'lead',
      } as never);

      const result = await service.update(
        ROLE_ID,
        ORG_ID,
        { name: 'lead' },
        'actor-id',
      );

      expect(repository.update).toHaveBeenCalledWith(ROLE_ID, {
        name: 'lead',
        updatedBy: 'actor-id',
      });
      expect(result.name).toBe('lead');
    });

    it('should throw ConflictException when new name already exists in org', async () => {
      repository.findById.mockResolvedValue(mockOrgRole as never);
      repository.findByNameAndOrg.mockResolvedValue({
        ...mockOrgRole,
        id: 'other-id',
      } as never);

      await expect(
        service.update(ROLE_ID, ORG_ID, { name: 'lead' }, 'actor-id'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete role with no active members or invitations', async () => {
      repository.findById.mockResolvedValue(mockOrgRole as never);
      repository.countMemberships.mockResolvedValue(0);
      repository.countPendingInvitations.mockResolvedValue(0);
      repository.delete.mockResolvedValue(mockOrgRole as never);

      await service.delete(ROLE_ID, ORG_ID);

      expect(repository.delete).toHaveBeenCalledWith(ROLE_ID);
    });

    it('should throw ConflictException when role has active members', async () => {
      repository.findById.mockResolvedValue(mockOrgRole as never);
      repository.countMemberships.mockResolvedValue(3);

      await expect(service.delete(ROLE_ID, ORG_ID)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when role has pending invitations', async () => {
      repository.findById.mockResolvedValue(mockOrgRole as never);
      repository.countMemberships.mockResolvedValue(0);
      repository.countPendingInvitations.mockResolvedValue(2);

      await expect(service.delete(ROLE_ID, ORG_ID)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
