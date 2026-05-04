import { ApiProperty } from '@nestjs/swagger';

export class MonthlyHistoryItemDto {
  @ApiProperty({ example: 'Abr' })
  monthLabel!: string;

  @ApiProperty({ example: 4 })
  month!: number;

  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ example: 12 })
  total!: number;
}

export class MonthlyHistoryResponseDto {
  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone!: string;

  @ApiProperty({ type: [MonthlyHistoryItemDto] })
  data!: MonthlyHistoryItemDto[];
}

export class TeamPerformanceResponseDto {
  @ApiProperty({ nullable: true, example: 7.5 })
  individual!: number | null;

  @ApiProperty({ example: 5.2 })
  teamAverage!: number;

  @ApiProperty({ example: 2.3 })
  difference!: number;

  @ApiProperty({ example: true })
  hasIndividualData!: boolean;
}

export class CurrentMonthByGenderResponseDto {
  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone!: string;

  @ApiProperty({ example: 4 })
  month!: number;

  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ example: 20 })
  total!: number;

  @ApiProperty({ example: 11 })
  male!: number;

  @ApiProperty({ example: 9 })
  female!: number;
}

export class DashboardSummaryResponseDto {
  @ApiProperty({ type: CurrentMonthByGenderResponseDto })
  currentMonthByGender!: CurrentMonthByGenderResponseDto;

  @ApiProperty({ type: TeamPerformanceResponseDto })
  teamPerformance!: TeamPerformanceResponseDto;

  @ApiProperty({ type: MonthlyHistoryResponseDto })
  monthlyHistory!: MonthlyHistoryResponseDto;
}

// --- Mobile Professional Dashboard ---

export class MobileEvaluationsDto {
  @ApiProperty({ example: 20 })
  currentMonth!: number;

  @ApiProperty({ example: 17 })
  previousMonth!: number;

  @ApiProperty({ nullable: true, example: 17.65 })
  percentageChange!: number | null;

  @ApiProperty({ example: 5 })
  month!: number;

  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone!: string;
}

export class MobileAverageItemDto {
  @ApiProperty({ example: 15.5 })
  value!: number;

  @ApiProperty({ nullable: true, example: 10.0 })
  percentageChange!: number | null;

  @ApiProperty({ enum: ['up', 'down', 'stable'], example: 'up' })
  trend!: 'up' | 'down' | 'stable';
}

export class MobileAveragesDto {
  @ApiProperty({ type: MobileAverageItemDto })
  global!: MobileAverageItemDto;

  @ApiProperty({ type: MobileAverageItemDto })
  individual!: MobileAverageItemDto;
}

export class MobileGenderDistributionDto {
  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 50 })
  male!: number;

  @ApiProperty({ example: 50.0 })
  malePercentage!: number;

  @ApiProperty({ example: 50 })
  female!: number;

  @ApiProperty({ example: 50.0 })
  femalePercentage!: number;
}

export class ProfessionalMobileSummaryResponseDto {
  @ApiProperty({ type: MobileEvaluationsDto })
  evaluations!: MobileEvaluationsDto;

  @ApiProperty({ type: MobileAveragesDto })
  averages!: MobileAveragesDto;

  @ApiProperty({ type: MonthlyHistoryResponseDto })
  monthlyHistory!: MonthlyHistoryResponseDto;

  @ApiProperty({ type: MobileGenderDistributionDto })
  genderDistribution!: MobileGenderDistributionDto;
}
