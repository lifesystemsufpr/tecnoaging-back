export class TestMetrics {
  name: string;
  fullName: string;
  count: number;
  percentage: number;
}

export class MostPerformedTestsDto {
  tests: TestMetrics[];
  total: number;
  mostPerformed: {
    name: string;
    count: number;
  } | null;
}
