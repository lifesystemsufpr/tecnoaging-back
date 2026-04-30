import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { Gender, TestType } from '../dto/dashboard-advanced.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DashboardAdvancedRepository {
  constructor(private prisma: PrismaService) {}

  async getAverageTestByAgeGroup(
    healthProfessionalId: string,
    gender?: Gender,
  ) {
    // Query para box plot 30STS por faixa etária
    return this.prisma.$queryRaw<any[]>`
      SELECT
        CASE
          WHEN (EXTRACT(YEAR FROM AGE(p."birthday")) BETWEEN 70 AND 74) THEN '70-74'
          WHEN (EXTRACT(YEAR FROM AGE(p."birthday")) BETWEEN 75 AND 79) THEN '75-79'
          WHEN (EXTRACT(YEAR FROM AGE(p."birthday")) BETWEEN 80 AND 84) THEN '80-84'
          WHEN (EXTRACT(YEAR FROM AGE(p."birthday")) BETWEEN 85 AND 89) THEN '85-89'
          ELSE '>=90'
        END as age_group,
        COUNT(*) as count,
        AVG(ei."repetitionCount")::float as average,
        MIN(ei."repetitionCount") as min,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ei."repetitionCount") as q1,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ei."repetitionCount") as median,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ei."repetitionCount") as q3,
        MAX(ei."repetitionCount") as max
      FROM "evaluation" e
      JOIN "evaluation_indicators" ei ON e.id = ei."evaluationId"
      JOIN "participant" p ON e."participantId" = p.id
      JOIN "user" u ON p.id = u.id
      WHERE e."healthProfessionalId" = ${healthProfessionalId}
        ${gender ? Prisma.sql`AND u.gender = ${gender}` : Prisma.empty}
      GROUP BY age_group
      ORDER BY age_group;
    `;
  }

  async getMonthlyHistory(healthProfessionalId: string, gender?: Gender) {
    // Query para histórico 12 meses
    return this.prisma.$queryRaw<any[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', e.date), 'YYYY-MM') as month,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE u.gender = 'MALE') as male,
        COUNT(*) FILTER (WHERE u.gender = 'FEMALE') as female,
        ROUND(AVG(ei."repetitionCount")::numeric, 2) as average
      FROM "evaluation" e
      JOIN "evaluation_indicators" ei ON e.id = ei."evaluationId"
      JOIN "participant" p ON e."participantId" = p.id
      JOIN "user" u ON p.id = u.id
      WHERE e."healthProfessionalId" = ${healthProfessionalId}
        AND e.date >= (CURRENT_DATE - INTERVAL '12 months')
        ${gender ? Prisma.sql`AND u.gender = ${gender}` : Prisma.empty}
      GROUP BY DATE_TRUNC('month', e.date)
      ORDER BY month;
    `;
  }

  async getDashboardSummary(healthProfessionalId: string, gender?: Gender) {
    // Query para agregador
    return this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(DISTINCT p.id) as total_patients,
        COUNT(e.id) as total_evaluations,
        COUNT(e.id) FILTER (WHERE DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE)) as current_month_evaluations
      FROM "evaluation" e
      JOIN "participant" p ON e."participantId" = p.id
      JOIN "user" u ON p.id = u.id
      WHERE e."healthProfessionalId" = ${healthProfessionalId}
        ${gender ? Prisma.sql`AND u.gender = ${gender}` : Prisma.empty}
    `;
  }

  async getCurrentMonthEvaluations(
    healthProfessionalId: string,
    gender?: Gender,
  ) {
    // Query para card mês
    return this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) as total_evaluations,
        COUNT(*) FILTER (WHERE u.gender = 'MALE') as male,
        COUNT(*) FILTER (WHERE u.gender = 'FEMALE') as female,
        TO_CHAR(DATE_TRUNC('month', CURRENT_DATE), 'YYYY-MM') as current_month
      FROM "evaluation" e
      JOIN "participant" p ON e."participantId" = p.id
      JOIN "user" u ON p.id = u.id
      WHERE e."healthProfessionalId" = ${healthProfessionalId}
        AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE)
        ${gender ? Prisma.sql`AND u.gender = ${gender}` : Prisma.empty}
    `;
  }

  async getEvaluationsByTestAndGender(
    healthProfessionalId: string,
    test?: TestType,
    gender?: Gender,
  ) {
    // Query para filtro teste+sexo
    return this.prisma.$queryRaw<any[]>`
      SELECT
        e.type as test,
        u.gender as gender,
        COUNT(*) as total,
        ROUND(AVG(ei."repetitionCount")::numeric, 2) as average
      FROM "evaluation" e
      JOIN "evaluation_indicators" ei ON e.id = ei."evaluationId"
      JOIN "participant" p ON e."participantId" = p.id
      JOIN "user" u ON p.id = u.id
      WHERE e."healthProfessionalId" = ${healthProfessionalId}
        ${test ? Prisma.sql`AND e.type = ${test}` : Prisma.empty}
        ${gender ? Prisma.sql`AND u.gender = ${gender}` : Prisma.empty}
      GROUP BY e.type, u.gender
      ORDER BY total DESC;
    `;
  }
}
