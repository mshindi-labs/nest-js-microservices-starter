import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { AuthController } from './auth.controller';
import { AUTH_SERVICE } from '@app/contracts';
import { mockUser } from '@app/common/types/authenticated-request';

describe('AuthController (gateway)', () => {
  let controller: AuthController;
  const mockAuthClient = { send: jest.fn() };

  const mockAuthResponse = {
    accessToken: 'access.token.here',
    refreshToken: 'refresh.token.here',
    user: { id: 1, name: 'Test User' },
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
        roleId: 1,
        password: 'Password123!',
        accountType: 'EMAIL' as never,
      };

      const result = await controller.signup(dto);

      expect(mockAuthClient.send).toHaveBeenCalledWith('auth.signup', dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('login', () => {
    it('should forward login request to auth-service', async () => {
      mockAuthClient.send.mockReturnValue(of(mockAuthResponse));

      const dto = { identifier: 'test@example.com', password: 'Password123!' };

      const result = await controller.login(dto);

      expect(mockAuthClient.send).toHaveBeenCalledWith('auth.login', dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('getCurrentUser', () => {
    it('should forward getMe request with user context', async () => {
      const currentUserResponse = { id: 'acc-id', userId: 1, user: {} };
      mockAuthClient.send.mockReturnValue(of(currentUserResponse));

      const result = await controller.getCurrentUser(mockUser);

      expect(mockAuthClient.send).toHaveBeenCalledWith('auth.me', {
        context: mockUser,
      });
      expect(result).toEqual(currentUserResponse);
    });
  });
});
