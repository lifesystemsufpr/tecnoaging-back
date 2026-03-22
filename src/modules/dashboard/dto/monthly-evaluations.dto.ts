export class MonthData {
  month: string;
  monthNumber: number;
  count: number;
  date: string;
}

export class MonthlyEvaluationsDto {
  monthlyData: MonthData[];
  totalYear: number;
  currentMonth: number;
  currentYear: number;
}
