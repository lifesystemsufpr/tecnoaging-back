// Tipos para os retornos do repository
type AgeGroupRow = {
  age_group: string;
  count: number;
  average: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
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
  total_evaluations: number;
  current_month_evaluations: number;
};

type CurrentMonthRow = {
  current_month: string;
  total_evaluations: number;
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
  AverageTestByAgeGroupDto,
  MonthlyHistoryDto,
  DashboardSummaryDto,
  CurrentMonthEvaluationsDto,
  EvaluationsByTestAndGenderDto,
  Gender,
  TestType,
} from './dto/dashboard-advanced.dto';

@Injectable()
export class DashboardAdvancedService {
  constructor(private repository: DashboardAdvancedRepository) {}

  async getAverageTestByAgeGroup(
    healthProfessionalId: string,
    gender?: Gender,
  ): Promise<AverageTestByAgeGroupDto[]> {
    const data = (await this.repository.getAverageTestByAgeGroup(
      healthProfessionalId,
      gender,
    )) as AgeGroupRow[];
    return data.map((item) => ({
      ageGroup: item.age_group,
      count: Number(item.count),
      average: Number(item.average),
      min: Number(item.min),
      q1: Number(item.q1),
      median: Number(item.median),
      q3: Number(item.q3),
      max: Number(item.max),
    }));
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
