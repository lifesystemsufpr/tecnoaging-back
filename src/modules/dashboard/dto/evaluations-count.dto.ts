export class EvaluationsCountDto {
  totalEvaluations: number;
  monthlyChange: {
    percentage: number;
    value: number;
    trend: 'positive' | 'negative' | 'neutral';
  };
}
