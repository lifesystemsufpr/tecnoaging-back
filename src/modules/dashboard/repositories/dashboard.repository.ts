import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class DashboardRepository {
  constructor(private prisma: PrismaService) {}

  async getEvaluationsCountByParticipant(participantId: string) {
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

    const prevMonthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1,
    );
    const prevMonthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      0,
    );

    const result = await this.prisma.$queryRaw<
      Array<{
        total: bigint;
        current_month: bigint;
        previous_month: bigint;
      }>
    >`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN date >= ${monthStart} AND date <= ${monthEnd} THEN 1 ELSE 0 END) as current_month,
        SUM(CASE WHEN date >= ${prevMonthStart} AND date <= ${prevMonthEnd} THEN 1 ELSE 0 END) as previous_month
      FROM "evaluation"
      WHERE "participantId" = ${participantId}
    `;

    return result[0];
  }

  async getMostPerformedTestsByParticipant(participantId: string) {
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

    const result = await this.prisma.$queryRaw<
      Array<{
        type: string;
        count: bigint;
        total: bigint;
      }>
    >`
      SELECT
        type,
        COUNT(*) as count,
        (SELECT COUNT(*) FROM "evaluation" WHERE "participantId" = ${participantId} AND date >= ${monthStart} AND date <= ${monthEnd}) as total
      FROM "evaluation"
      WHERE "participantId" = ${participantId}
        AND date >= ${monthStart}
        AND date <= ${monthEnd}
      GROUP BY type
      ORDER BY count DESC
    `;

    return result;
  }

  async getAverageDurationByParticipant(participantId: string) {
    const result = await this.prisma.$queryRaw<
      Array<{
        average_duration: number;
        count: bigint;
      }>
    >`
      SELECT
        ROUND(AVG(EXTRACT(EPOCH FROM ("time_end" - "time_init")))) as average_duration,
        COUNT(*) as count
      FROM "evaluation"
      WHERE "participantId" = ${participantId}
    `;

    return result[0];
  }

  async getMonthlyEvaluationsByParticipant(participantId: string) {
    const currentDate = new Date(2026, 2, 18);
    const currentYear = currentDate.getFullYear();

    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const result = await this.prisma.$queryRaw<
      Array<{
        month: number;
        count: bigint;
      }>
    >`
      SELECT
        EXTRACT(MONTH FROM date)::int as month,
        COUNT(*) as count
      FROM "evaluation"
      WHERE "participantId" = ${participantId}
        AND date >= ${yearStart}
        AND date <= ${yearEnd}
      GROUP BY EXTRACT(MONTH FROM date)
      ORDER BY month
    `;

    return result;
  }

  async getMonthlyAverageByParticipant(participantId: string) {
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

    const result = await this.prisma.$queryRaw<
      Array<{
        average_duration: number;
        count: bigint;
      }>
    >`
      SELECT
        ROUND(AVG(EXTRACT(EPOCH FROM ("time_end" - "time_init")))) as average_duration,
        COUNT(*) as count
      FROM "evaluation"
      WHERE "participantId" = ${participantId}
        AND date >= ${monthStart}
        AND date <= ${monthEnd}
    `;

    return result[0];
  }
}
