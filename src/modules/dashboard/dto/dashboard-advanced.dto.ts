import { ApiProperty } from '@nestjs/swagger';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum TestType {
  TUG = 'TUG',
  FTSTS = 'FTSTS', // 5STS
  TTSTS = 'TTSTS', // 30STS
  MST2 = '2MST', // 2MST (futuro)
}

// Reservado para uso futuro, se necessário filtros avançados

export class AverageTestByAgeGroupDto {
  @ApiProperty()
  ageGroup: string;
  @ApiProperty()
  count: number;
  @ApiProperty()
  average: number;
  @ApiProperty()
  min: number;
  @ApiProperty()
  q1: number;
  @ApiProperty()
  median: number;
  @ApiProperty()
  q3: number;
  @ApiProperty()
  max: number;
}

export class MonthlyHistoryDto {
  @ApiProperty()
  month: string; // yyyy-MM
  @ApiProperty()
  total: number;
  @ApiProperty({ type: Object })
  byGender: { MALE: number; FEMALE: number };
  @ApiProperty()
  averageRepetitions: number;
}

export class DashboardSummaryDto {
  @ApiProperty()
  totalPatients: number;
  @ApiProperty()
  totalEvaluations: number;
  @ApiProperty()
  currentMonthEvaluations: number;
  @ApiProperty({ required: false })
  trend?: number;
}

export class CurrentMonthEvaluationsDto {
  @ApiProperty()
  currentMonth: string; // yyyy-MM
  @ApiProperty()
  totalEvaluations: number;
  @ApiProperty({ type: Object })
  byGender: { MALE: number; FEMALE: number };
}

export class EvaluationsByTestAndGenderDto {
  @ApiProperty()
  test: string;
  @ApiProperty()
  gender: string;
  @ApiProperty()
  total: number;
  @ApiProperty()
  average: number;
}
