import { Injectable } from '@nestjs/common';
import {
  EvaluationsCountDto,
  MostPerformedTestsDto,
  AverageDurationDto,
  MonthlyEvaluationsDto,
  MonthlyAverageDto,
} from './dto';
import { DashboardRepository } from './repositories/dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private repository: DashboardRepository) {}

  async getEvaluationsCount(
    participantId: string,
  ): Promise<EvaluationsCountDto> {
    const counts =
      await this.repository.getEvaluationsCountByParticipant(participantId);

    const totalEvaluations = Number(counts.total);
    const monthlyEvaluations = Number(counts.current_month);
    const previousMonthEvaluations = Number(counts.previous_month);

    let percentage = 0;
    let trend: 'positive' | 'negative' | 'neutral' = 'neutral';

    if (previousMonthEvaluations > 0) {
      percentage =
        ((monthlyEvaluations - previousMonthEvaluations) /
          previousMonthEvaluations) *
        100;
    } else if (monthlyEvaluations > 0) {
      percentage = 100;
    }

    if (percentage > 0) trend = 'positive';
    else if (percentage < 0) trend = 'negative';

    return {
      totalEvaluations,
      monthlyChange: {
        percentage: Math.round(percentage),
        value: monthlyEvaluations,
        trend,
      },
    };
  }

  async getMostPerformedTests(
    participantId: string,
  ): Promise<MostPerformedTestsDto> {
    const testResults =
      await this.repository.getMostPerformedTestsByParticipant(participantId);

    const testNames: Record<string, string> = {
      FTSTS: 'FTSTS (5 Times Sit to Stand Test)',
      TTSTS: 'TTSTS (30 Times Sit to Stand Test)',
      TMSTS: 'TMSTS (2 Minute Sit to Stand Test)',
    };

    const total = testResults.reduce(
      (sum, item) => sum + Number(item.count),
      0,
    );

    const tests = testResults.map((item) => ({
      name: item.type,
      fullName: testNames[item.type] || item.type,
      count: Number(item.count),
      percentage:
        total > 0 ? Math.round((Number(item.count) / total) * 100) : 0,
    }));

    let mostPerformed: { name: string; count: number } | null = null;
    if (tests.length > 0) {
      mostPerformed = {
        name: tests[0].name,
        count: tests[0].count,
      };
    }

    return {
      tests,
      total,
      mostPerformed,
    };
  }

  async getAverageDuration(participantId: string): Promise<AverageDurationDto> {
    const result =
      await this.repository.getAverageDurationByParticipant(participantId);

    const averageDuration = result?.average_duration || 0;
    const trend: 'slower' | 'faster' =
      Number(result?.count || 0) === 0 ? 'faster' : 'slower';

    return {
      averageDuration: {
        value: averageDuration,
        unit: 'seconds',
        display: `${averageDuration}s`,
      },
      comparison: {
        text: trend === 'slower' ? 'mais lento' : 'mais rápido',
        percentage: 0,
        trend,
      },
    };
  }

  async getMonthlyEvaluations(
    participantId: string,
  ): Promise<MonthlyEvaluationsDto> {
    const currentDate = new Date(2026, 2, 18);
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const monthNames = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];

    const dbResults =
      await this.repository.getMonthlyEvaluationsByParticipant(participantId);

    const monthlyData: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) {
      monthlyData[i] = 0;
    }

    dbResults.forEach((item) => {
      monthlyData[item.month] = Number(item.count);
    });

    const monthlyArray = Object.entries(monthlyData).map(
      ([monthNum, count]) => ({
        month: monthNames[parseInt(monthNum) - 1],
        monthNumber: parseInt(monthNum),
        count,
        date: `${currentYear}-${String(monthNum).padStart(2, '0')}`,
      }),
    );

    const totalYear = Object.values(monthlyData).reduce((a, b) => a + b, 0);

    return {
      monthlyData: monthlyArray,
      totalYear,
      currentMonth,
      currentYear,
    };
  }

  async getMonthlyAverage(participantId: string): Promise<MonthlyAverageDto> {
    const currentDate = new Date(2026, 2, 18);
    const monthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const monthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );

    const evaluations =
      await this.repository.getMonthlyAverageByParticipant(participantId);

    const averageDuration = evaluations?.average_duration || 0;
    const evaluationCount = Number(evaluations?.count || 0);
    const evaluationType = evaluations?.type || 'TTSTS';

    const testNames: Record<string, string> = {
      FTSTS: 'FTSTS (5 Times Sit to Stand Test)',
      TTSTS: 'TTSTS (30 Times Sit to Stand Test)',
      TMSTS: 'TMSTS (2 Minute Sit to Stand Test)',
    };

    const evaluationTypes = [
      {
        type: evaluationType,
        fullName: testNames[evaluationType] || evaluationType,
        averageDuration,
        unit: 'seconds' as const,
        count: evaluationCount,
      },
    ];

    return {
      subtitle: `${evaluationType} em segundos`,
      evaluationTypes,
      overallAverage: averageDuration,
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      periodStart: monthStart.toISOString().split('T')[0],
      periodEnd: monthEnd.toISOString().split('T')[0],
    };
  }
}
