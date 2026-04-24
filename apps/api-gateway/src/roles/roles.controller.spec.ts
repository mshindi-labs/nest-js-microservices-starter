import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { RolesController } from './roles.controller';
import { AUTH_SERVICE, ROLES_PATTERNS } from '@app/contracts';
import type { AuthorizedUser } from '@app/common/types/authenticated-request';

describe('RolesController (gateway)', () => {
  let controller: RolesController;
  let authClient: { send: jest.Mock };

  const ORG_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  const ROLE_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  const mockUser: AuthorizedUser = {
    userId: 'user-uuid',
    accountId: 'account-uuid',
    name: 'Test User',
    roleId: ROLE_ID,
    roleName: 'owner',
    organizationId: ORG_ID,
  };

  const mockRole = {
    id: ROLE_ID,
    name: 'manager',
    organizationId: ORG_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    authClient = { send: jest.fn().mockReturnValue(of(mockRole)) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [{ provide: AUTH_SERVICE, useValue: authClient }],
    }).compile();

    controller = module.get<RolesController>(RolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should forward FIND_ALL with orgId and context', async () => {
      await controller.findAll(ORG_ID, { page: 1, size: 20 }, mockUser);

      expect(authClient.send).toHaveBeenCalledWith(ROLES_PATTERNS.FIND_ALL, {
        organizationId: ORG_ID,
        page: 1,
        size: 20,
        context: mockUser,
      });
    });
  });

  describe('findById', () => {
    it('should forward FIND_BY_ID with orgId and roleId', async () => {
      await controller.findById(ORG_ID, ROLE_ID, mockUser);

      expect(authClient.send).toHaveBeenCalledWith(ROLES_PATTERNS.FIND_BY_ID, {
        id: ROLE_ID,
        organizationId: ORG_ID,
        context: mockUser,
      });
    });
  });

  describe('create', () => {
    it('should forward CREATE with orgId as organizationId', async () => {
      await controller.create(ORG_ID, { name: 'manager' }, mockUser);

      expect(authClient.send).toHaveBeenCalledWith(ROLES_PATTERNS.CREATE, {
        name: 'manager',
        organizationId: ORG_ID,
        context: mockUser,
      });
    });
  });

  describe('update', () => {
    it('should forward UPDATE with orgId, roleId and partial dto', async () => {
      await controller.update(ORG_ID, ROLE_ID, { name: 'lead' }, mockUser);

      expect(authClient.send).toHaveBeenCalledWith(ROLES_PATTERNS.UPDATE, {
        id: ROLE_ID,
        organizationId: ORG_ID,
        name: 'lead',
        context: mockUser,
      });
    });
  });

  describe('remove', () => {
    it('should forward DELETE with orgId and roleId', async () => {
      await controller.remove(ORG_ID, ROLE_ID, mockUser);

      expect(authClient.send).toHaveBeenCalledWith(ROLES_PATTERNS.DELETE, {
        id: ROLE_ID,
        organizationId: ORG_ID,
        context: mockUser,
      });
    });
  });
});
