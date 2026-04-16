import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { ApiBudgetService } from './services/api-budget.service';

describe('AppController', () => {
  let appController: AppController;

  const prismaService = {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
  };

  const apiBudgetService = {
    checkMonthlyBudget: jest.fn().mockResolvedValue({
      used: 0,
      budget: 1.5,
      remaining: 1.5,
      withinBudget: true,
    }),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: PrismaService, useValue: prismaService },
        { provide: ApiBudgetService, useValue: apiBudgetService },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('database와 api budget 상태를 포함해 응답한다', async () => {
      const result = await appController.getHealth();

      expect(result.status).toBe('healthy');
      expect(result.services.database).toBe('healthy');
      expect(result.services.apiBudget).toBe('healthy');
      expect(result.apiBudget).toMatchObject({
        used: 0,
        budget: 1.5,
        remaining: 1.5,
        withinBudget: true,
      });
    });
  });

  describe('version', () => {
    it('버전과 런타임 정보를 반환한다', () => {
      const result = appController.getVersion();

      expect(result.version).toBeDefined();
      expect(result.node).toMatch(/^v\d+/);
      expect(result.platform).toBeDefined();
    });
  });
});
