export class MobileEvaluationsDto {
  currentMonth: number;
  previousMonth: number;
  percentageChange: number;
  month: number;
  year: number;
  timezone: string;
}

export class MobileAverageDetailDto {
  value: number;
  percentageChange: number;
  trend: string;
}

export class MobileAveragesDto {
  global: MobileAverageDetailDto;
  individual: MobileAverageDetailDto;
}

export class MobileMonthlyHistoryDataDto {
  monthLabel: string;
  month: number;
  year: number;
  total: number;
}

export class MobileMonthlyHistoryDto {
  timezone: string;
  data: MobileMonthlyHistoryDataDto[];
}

export class MobileGenderDistributionDto {
  total: number;
  male: number;
  malePercentage: number;
  female: number;
  femalePercentage: number;
}

export class MobileTestTypeDistributionDto {
  total: number;
  sts30: number;
  sts30Percentage: number;
  mst2: number;
  mst2Percentage: number;
}

export class MobileDashboardResponseDto {
  evaluations: MobileEvaluationsDto;
  averages: MobileAveragesDto;
  monthlyHistory: MobileMonthlyHistoryDto;
  genderDistribution: MobileGenderDistributionDto;
  totalTestsApplied: number;
  totalQuestionnairesApplied: number;
  testTypeDistribution: MobileTestTypeDistributionDto;
}
