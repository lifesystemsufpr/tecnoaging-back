import { ApiProperty } from '@nestjs/swagger';

export class MonthlyHistoryItemDto {
  @ApiProperty({ example: 'Abr' })
  monthLabel: string;

  @ApiProperty({ example: 4 })
  month: number;

  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ example: 12 })
  total: number;
}

export class MonthlyHistoryResponseDto {
  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone: string;

  @ApiProperty({ type: [MonthlyHistoryItemDto] })
  data: MonthlyHistoryItemDto[];
}

export class TeamPerformanceResponseDto {
  @ApiProperty({ nullable: true, example: 7.5 })
  individual: number | null;

  @ApiProperty({ example: 5.2 })
  teamAverage: number;

  @ApiProperty({ example: 2.3 })
  difference: number;

  @ApiProperty({ example: true })
  hasIndividualData: boolean;
}

export class CurrentMonthByGenderResponseDto {
  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone: string;

  @ApiProperty({ example: 4 })
  month: number;

  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ example: 20 })
  total: number;

  @ApiProperty({ example: 11 })
  male: number;

  @ApiProperty({ example: 9 })
  female: number;
}

export class DashboardSummaryResponseDto {
  @ApiProperty({ type: CurrentMonthByGenderResponseDto })
  currentMonthByGender: CurrentMonthByGenderResponseDto;

  @ApiProperty({ type: TeamPerformanceResponseDto })
  teamPerformance: TeamPerformanceResponseDto;

  @ApiProperty({ type: MonthlyHistoryResponseDto })
  monthlyHistory: MonthlyHistoryResponseDto;
}
