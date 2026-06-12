// Tipos para os retornos do repository
type AgeGroupRow = {
  age_group: AgeGroup;
  count: number;
  p5: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p95: number | null;
};

type MonthlyHistoryRow = {
  month: string;
  total: number;
  male: number;
  female: number;
  average: number;
};

type DashboardSummaryRow = {
  total_patients: number;
  male_patients: number;
  female_patients: number;
  total_evaluations: number;
  current_month_evaluations: number;
};

type CurrentMonthRow = {
  current_month: string;
  total_evaluations: number;
  total_patients: number;
  male: number;
  female: number;
};

type TestAndGenderRow = {
  test: string;
  gender: string;
  total: number;
  average: number;
};
import { Injectable } from '@nestjs/common';
import { DashboardAdvancedRepository } from './repositories/dashboard-advanced.repository';
import {
  AGE_GROUPS,
  AgeGroup,
  CurrentMonthEvaluationsDto,
  DashboardSummaryDto,
  EvaluationsByTestAndGenderDto,
  Gender,
  MonthlyHistoryDto,
  PERCENTILES,
  PercentileEntryDto,
  TestType,
} from './dto/dashboard-advanced.dto';

@Injectable()
export class DashboardAdvancedService {
  constructor(private repository: DashboardAdvancedRepository) {}

  async getAverageTestByAgeGroup(
    gender?: Gender,
  ): Promise<PercentileEntryDto[]> {
    const data = (await this.repository.getAverageTestByAgeGroup(
      gender,
    )) as AgeGroupRow[];

    const byAgeGroup = new Map<AgeGroup, AgeGroupRow>();
    for (const row of data) {
      byAgeGroup.set(row.age_group, row);
    }

    const percentileColumns: Record<
      (typeof PERCENTILES)[number],
      keyof AgeGroupRow
    > = {
      5: 'p5',
      25: 'p25',
      50: 'p50',
      75: 'p75',
      95: 'p95',
    };

    return PERCENTILES.map((percentile) => {
      const values = AGE_GROUPS.reduce(
        (acc, group) => {
          const row = byAgeGroup.get(group);
          const raw = row ? row[percentileColumns[percentile]] : null;
          acc[group] = raw == null ? 0 : Number(raw);
          return acc;
        },
        {} as Record<AgeGroup, number>,
      );

      return { percentile, values };
    });
  }

  async getMonthlyHistory(
    healthProfessionalId: string,
    gender?: Gender,
  ): Promise<MonthlyHistoryDto[]> {
    const data = (await this.repository.getMonthlyHistory(
      healthProfessionalId,
      gender,
    )) as MonthlyHistoryRow[];
    const months = getLastTwelveMonths();
    return months.map((month) => {
      const found = data.find((d) => d.month === month);
      return {
        month,
        total: found ? Number(found.total) : 0,
        byGender: {
          MALE: found ? Number(found.male) : 0,
          FEMALE: found ? Number(found.female) : 0,
        },
        averageRepetitions: found ? Number(found.average) : 0,
      };
    });
  }

  async getDashboardSummary(
    healthProfessionalId: string,
    gender?: Gender,
  ): Promise<DashboardSummaryDto> {
    const [summary] = (await this.repository.getDashboardSummary(
      healthProfessionalId,
      gender,
    )) as DashboardSummaryRow[];
    return {
      totalPatients: Number(summary.total_patients),
      patientsByGender: {
        MALE: Number(summary.male_patients),
        FEMALE: Number(summary.female_patients),
      },
      totalEvaluations: Number(summary.total_evaluations),
      currentMonthEvaluations: Number(summary.current_month_evaluations),
    };
  }

  async getCurrentMonthEvaluations(
    healthProfessionalId: string,
    gender?: Gender,
  ): Promise<CurrentMonthEvaluationsDto> {
    const [data] = (await this.repository.getCurrentMonthEvaluations(
      healthProfessionalId,
      gender,
    )) as CurrentMonthRow[];
    return {
      currentMonth: data.current_month,
      totalEvaluations: Number(data.total_evaluations),
      totalPatients: Number(data.total_patients),
      byGender: {
        MALE: Number(data.male),
        FEMALE: Number(data.female),
      },
    };
  }

  async getEvaluationsByTestAndGender(
    healthProfessionalId: string,
    test?: TestType,
    gender?: Gender,
  ): Promise<EvaluationsByTestAndGenderDto[]> {
    const data = (await this.repository.getEvaluationsByTestAndGender(
      healthProfessionalId,
      test,
      gender,
    )) as TestAndGenderRow[];
    return data.map((item) => ({
      test: item.test,
      gender: item.gender,
      total: Number(item.total),
      average: Number(item.average),
    }));
  }
}

// Utilitário para gerar os últimos 12 meses no formato 'YYYY-MM'
function getLastTwelveMonths(): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    );
  }
  return result;
}
