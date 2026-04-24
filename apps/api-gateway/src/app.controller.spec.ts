import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getRoot', () => {
    it('should return OK message', () => {
      expect(appController.getRoot()).toEqual({ message: 'OK!' });
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const health = appController.getHealth();

      expect(health.status).toBe('ok');
      expect(typeof health.uptime).toBe('number');
      expect(health.memory).toBeDefined();
      expect(health.cpu).toBeDefined();
    });
  });
});
