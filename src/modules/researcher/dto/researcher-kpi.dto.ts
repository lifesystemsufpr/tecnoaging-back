import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AgeKpi {
  @ApiProperty({
    description: 'Average age of participants',
    example: 42.5,
    type: Number,
  })
  average: number;

  @ApiProperty({
    description: 'Age standard deviation',
    example: 14.2,
    type: Number,
  })
  standardDeviation: number;
}

export class AbsolutePercentageKpi {
  @ApiProperty({
    description: 'Absolute value',
    example: 1837,
    type: Number,
  })
  absolute: number;

  @ApiProperty({
    description: 'Percentage value',
    example: 74.98,
    type: Number,
  })
  percentage: number;
}

export class GenderDistributionKpi {
  @ApiProperty({
    description: 'Male participants distribution',
    type: AbsolutePercentageKpi,
  })
  male: AbsolutePercentageKpi;

  @ApiProperty({
    description: 'Female participants distribution',
    type: AbsolutePercentageKpi,
  })
  female: AbsolutePercentageKpi;
}

export class ResearcherKpi {
  @ApiProperty({
    description: 'Total participants',
    example: 2450,
    type: Number,
  })
  totalParticipants: number;

  @ApiProperty({
    description: 'Age statistics',
    type: AgeKpi,
  })
  age: AgeKpi;

  @ApiProperty({
    description: 'Active participants statistics',
    type: AbsolutePercentageKpi,
  })
  activeParticipants: AbsolutePercentageKpi;

  @ApiProperty({
    description: 'Gender distribution statistics',
    type: GenderDistributionKpi,
  })
  genderDistribution: GenderDistributionKpi;
}

export class GetKPIQueryParams {
  @ApiProperty({
    description: 'start date for KPI data',
    example: '2024-01-01',
    type: String,
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    description: 'end date for KPI data',
    example: '2024-01-01',
    type: String,
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}
