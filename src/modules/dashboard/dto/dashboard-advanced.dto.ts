import { ApiProperty } from '@nestjs/swagger';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum TestType {
  TUG = 'TUG',
  FTSTS = 'FTSTS', // 5 Times Sit to Stand Test
  TTSTS = 'TTSTS', // 30 Times Sit to Stand Test
  TMSTS = 'TMSTS', // 2 Minutes Step Test
}

// Reservado para uso futuro, se necessário filtros avançados

export type AgeGroup = '70-74' | '75-79' | '80-84' | '85-89' | '≥90';

export const AGE_GROUPS: AgeGroup[] = [
  '70-74',
  '75-79',
  '80-84',
  '85-89',
  '≥90',
];

export const PERCENTILES = [5, 25, 50, 75, 95] as const;

export class PercentileEntryDto {
  @ApiProperty({ enum: PERCENTILES })
  percentile: number;
  @ApiProperty({
    type: Object,
    example: {
      '70-74': 25,
      '75-79': 24,
      '80-84': 22,
      '85-89': 20,
      '≥90': 19,
    },
  })
  values: Record<AgeGroup, number>;
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
  @ApiProperty({
    type: Object,
    description: 'Distribuição de pacientes únicos por sexo',
  })
  patientsByGender: { MALE: number; FEMALE: number };
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
  @ApiProperty({ description: 'Pacientes únicos atendidos no mês' })
  totalPatients: number;
  @ApiProperty({
    type: Object,
    description: 'Distribuição de pacientes únicos por sexo',
  })
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
