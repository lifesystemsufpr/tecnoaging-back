import { Test, TestingModule } from '@nestjs/testing';
import { DashboardAdvancedService } from '../../src/modules/dashboard/dashboard-advanced.service';
import { DashboardAdvancedRepository } from '../../src/modules/dashboard/repositories/dashboard-advanced.repository';

describe('DashboardAdvancedService', () => {
  let service: DashboardAdvancedService;
  let repository: DashboardAdvancedRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardAdvancedService,
        {
          provide: DashboardAdvancedRepository,
          useValue: {
            getAverageTestByAgeGroup: jest.fn().mockResolvedValue([]),
            getMonthlyHistory: jest.fn().mockResolvedValue([]),
            getDashboardSummary: jest
              .fn()
              .mockResolvedValue([
                {
                  total_patients: 1,
                  total_evaluations: 2,
                  current_month_evaluations: 1,
                },
              ]),
            getCurrentMonthEvaluations: jest
              .fn()
              .mockResolvedValue([
                {
                  current_month: '2026-04',
                  total_evaluations: 1,
                  male: 1,
                  female: 0,
                },
              ]),
            getEvaluationsByTestAndGender: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardAdvancedService>(DashboardAdvancedService);
    repository = module.get<DashboardAdvancedRepository>(
      DashboardAdvancedRepository,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty array for getAverageTestByAgeGroup', async () => {
    expect(await service.getAverageTestByAgeGroup('hp1')).toEqual([]);
  });

  it('should return 12 months for getMonthlyHistory', async () => {
    const result = await service.getMonthlyHistory('hp1');
    expect(result).toHaveLength(12);
  });

  it('should return dashboard summary', async () => {
    const result = await service.getDashboardSummary('hp1');
    expect(result).toEqual({
      totalPatients: 1,
      totalEvaluations: 2,
      currentMonthEvaluations: 1,
    });
  });

  it('should return current month evaluations', async () => {
    const result = await service.getCurrentMonthEvaluations('hp1');
    expect(result).toEqual({
      currentMonth: '2026-04',
      totalEvaluations: 1,
      byGender: { MALE: 1, FEMALE: 0 },
    });
  });

  it('should return empty array for getEvaluationsByTestAndGender', async () => {
    expect(await service.getEvaluationsByTestAndGender('hp1')).toEqual([]);
  });
});
