import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  EvaluationsCountDto,
  MostPerformedTestsDto,
  AverageDurationDto,
  MonthlyEvaluationsDto,
  MonthlyAverageDto,
} from './dto';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getEvaluationsCount(
    participantId: string,
  ): Promise<EvaluationsCountDto> {
    const totalEvaluations = await this.prisma.evaluation.count({
      where: { participantId },
    });

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

    const monthlyEvaluations = await this.prisma.evaluation.count({
      where: {
        participantId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    const prevMonthEnd = new Date(monthStart);
    prevMonthEnd.setDate(0);
    const prevMonthStart = new Date(
      prevMonthEnd.getFullYear(),
      prevMonthEnd.getMonth(),
      1,
    );

    const previousMonthEvaluations = await this.prisma.evaluation.count({
      where: {
        participantId,
        date: {
          gte: prevMonthStart,
          lte: prevMonthEnd,
        },
      },
    });

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

    const evaluationsByType = await this.prisma.evaluation.groupBy({
      by: ['type'],
      where: {
        participantId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _count: true,
    });

    const testNames: Record<string, string> = {
      FTSTS: 'FTSTS (5 Times Sit to Stand Test)',
      TTSTS: 'TTSTS (30 Times Sit to Stand Test)',
    };

    const total = evaluationsByType.reduce((sum, item) => sum + item._count, 0);

    const tests = evaluationsByType.map((item) => ({
      name: item.type,
      fullName: testNames[item.type] || item.type,
      count: item._count,
      percentage: total > 0 ? Math.round((item._count / total) * 100) : 0,
    }));

    let mostPerformed: { name: string; count: number } | null = null;
    if (tests.length > 0) {
      const top = tests.reduce(
        (prev, current) => (current.count > prev.count ? current : prev),
        tests[0],
      );
      mostPerformed = {
        name: top.name,
        count: top.count,
      };
    }

    return {
      tests,
      total,
      mostPerformed,
    };
  }

  async getAverageDuration(participantId: string): Promise<AverageDurationDto> {
    const evaluations = await this.prisma.evaluation.findMany({
      where: { participantId },
      select: {
        time_init: true,
        time_end: true,
      },
    });

    let averageDuration = 0;
    if (evaluations.length > 0) {
      const totalSeconds = evaluations.reduce((sum, evaluation) => {
        const duration =
          new Date(evaluation.time_end).getTime() -
          new Date(evaluation.time_init).getTime();
        return sum + duration / 1000;
      }, 0);
      averageDuration = Math.round(totalSeconds / evaluations.length);
    }

    const trend: 'slower' | 'faster' =
      evaluations.length === 0 ? 'faster' : 'slower';

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

    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const evaluationsByMonth = await this.prisma.evaluation.groupBy({
      by: ['date'],
      where: {
        participantId,
        date: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
      _count: true,
    });

    const monthlyData: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) {
      monthlyData[i] = 0;
    }

    evaluationsByMonth.forEach((item) => {
      const month = new Date(item.date).getMonth() + 1;
      monthlyData[month]++;
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

    // Avaliações do mês corrente agrupadas por tipo
    const evaluationsByType = await this.prisma.evaluation.findMany({
      where: {
        participantId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: {
        type: true,
        time_init: true,
        time_end: true,
      },
    });

    const testNames: Record<string, string> = {
      FTSTS: 'FTSTS (5 Times Sit to Stand Test)',
      TTSTS: 'TTSTS (30 Times Sit to Stand Test)',
    };

    const grouped: Record<string, { durations: number[]; count: number }> = {
      FTSTS: { durations: [], count: 0 },
      TTSTS: { durations: [], count: 0 },
    };

    evaluationsByType.forEach((evaluation) => {
      const duration =
        (new Date(evaluation.time_end).getTime() -
          new Date(evaluation.time_init).getTime()) /
        1000;
      grouped[evaluation.type].durations.push(duration);
      grouped[evaluation.type].count++;
    });

    const evaluationTypes = Object.entries(grouped).map(([type, data]) => {
      const averageDuration =
        data.durations.length > 0
          ? Math.round(
              data.durations.reduce((a, b) => a + b, 0) / data.durations.length,
            )
          : 0;

      return {
        type,
        fullName: testNames[type] || type,
        averageDuration,
        unit: 'seconds' as const,
        count: data.count,
      };
    });

    const allDurations = [
      ...grouped.FTSTS.durations,
      ...grouped.TTSTS.durations,
    ];
    const overallAverage =
      allDurations.length > 0
        ? Math.round(
            allDurations.reduce((a, b) => a + b, 0) / allDurations.length,
          )
        : 0;

    return {
      subtitle: 'TUG e 5TSTS em segundos',
      evaluationTypes,
      overallAverage,
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      periodStart: monthStart.toISOString().split('T')[0],
      periodEnd: monthEnd.toISOString().split('T')[0],
    };
  }
}
