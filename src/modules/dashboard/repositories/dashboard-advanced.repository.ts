import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { Gender, TestType } from '../dto/dashboard-advanced.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DashboardAdvancedRepository {
  constructor(private prisma: PrismaService) {}

  async getAverageTestByAgeGroup(gender?: Gender) {
    // Box plot 30STS (TTSTS) por faixa etária — escopo populacional
    return this.prisma.$queryRaw<any[]>`
      SELECT
        CASE
          WHEN (EXTRACT(YEAR FROM AGE(p."birthday")) BETWEEN 70 AND 74) THEN '70-74'
          WHEN (EXTRACT(YEAR FROM AGE(p."birthday")) BETWEEN 75 AND 79) THEN '75-79'
          WHEN (EXTRACT(YEAR FROM AGE(p."birthday")) BETWEEN 80 AND 84) THEN '80-84'
          WHEN (EXTRACT(YEAR FROM AGE(p."birthday")) BETWEEN 85 AND 89) THEN '85-89'
          ELSE '≥90'
        END as age_group,
        COUNT(*) as count,
        PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY ei."repetitionCount") as p5,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ei."repetitionCount") as p25,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ei."repetitionCount") as p50,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ei."repetitionCount") as p75,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ei."repetitionCount") as p95
      FROM "evaluation" e
      JOIN "evaluation_indicators" ei ON e.id = ei."evaluationId"
      JOIN "participant" p ON e."participantId" = p.id
      JOIN "user" u ON p.id = u.id
      WHERE e.type = 'TTSTS'
        AND ei."repetitionCount" IS NOT NULL
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
        COUNT(DISTINCT p.id) FILTER (WHERE u.gender = 'MALE') as male_patients,
        COUNT(DISTINCT p.id) FILTER (WHERE u.gender = 'FEMALE') as female_patients,
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
    // Query para card mês — pacientes contados de forma única (não por avaliação)
    return this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) as total_evaluations,
        COUNT(DISTINCT p.id) as total_patients,
        COUNT(DISTINCT p.id) FILTER (WHERE u.gender = 'MALE') as male,
        COUNT(DISTINCT p.id) FILTER (WHERE u.gender = 'FEMALE') as female,
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
