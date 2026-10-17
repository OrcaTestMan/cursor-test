import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;
  const appService = { health: vi.fn() };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: appService }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('returns ok from health', async () => {
    appService.health.mockResolvedValue({ status: 'ok' });
    await expect(appController.health()).resolves.toEqual({ status: 'ok' });
  });
});
