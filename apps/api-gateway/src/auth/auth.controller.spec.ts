import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { AuthController } from './auth.controller';
import { AUTH_SERVICE } from '@app/contracts';
import { mockUser } from '@app/common/types/authenticated-request';
import type { Request } from 'express';

describe('AuthController (gateway)', () => {
  let controller: AuthController;
  const mockAuthClient = { send: jest.fn() };

  const mockRequest = {
    headers: { 'user-agent': 'test-agent' },
    ip: '127.0.0.1',
  } as unknown as Request;

  const mockAuthResponse = {
    accessToken: 'access.token.here',
    refreshToken: 'refresh.token.here',
    user: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Test User' },
  };

  beforeEach(async () => {
    mockAuthClient.send.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AUTH_SERVICE, useValue: mockAuthClient }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('should forward signup request to auth-service', async () => {
      mockAuthClient.send.mockReturnValue(of(mockAuthResponse));

      const dto = {
        name: 'Test',
        identifier: 'test@example.com',
        msisdn: '+255612345678',
        roleId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        password: 'Password123!',
        accountType: 'EMAIL' as never,
      };

      const result = await controller.signup(dto);

      expect(mockAuthClient.send).toHaveBeenCalledWith('auth.signup', dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('login', () => {
    it('should forward login request with userAgent and ipAddress', async () => {
      mockAuthClient.send.mockReturnValue(of(mockAuthResponse));

      const dto = { identifier: 'test@example.com', password: 'Password123!' };

      const result = await controller.login(dto, mockRequest);

      expect(mockAuthClient.send).toHaveBeenCalledWith('auth.login', {
        ...dto,
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
      });
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('getCurrentUser', () => {
    it('should forward getMe request with user context', async () => {
      const currentUserResponse = {
        id: 'acc-id-uuid',
        userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        user: {},
      };
      mockAuthClient.send.mockReturnValue(of(currentUserResponse));

      const result = await controller.getCurrentUser(mockUser);

      expect(mockAuthClient.send).toHaveBeenCalledWith('auth.me', {
        context: mockUser,
      });
      expect(result).toEqual(currentUserResponse);
    });
  });
});
