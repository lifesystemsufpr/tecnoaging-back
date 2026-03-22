export class EvaluationTypeMetrics {
  type: string;
  fullName: string;
  averageDuration: number;
  unit: 'seconds';
  count: number;
}

export class MonthlyAverageDto {
  subtitle: string;
  evaluationTypes: EvaluationTypeMetrics[];
  overallAverage: number;
  month: number;
  year: number;
  periodStart: string;
  periodEnd: string;
}
