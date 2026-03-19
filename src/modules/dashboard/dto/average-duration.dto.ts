export class AverageDurationDto {
  averageDuration: {
    value: number;
    unit: 'seconds';
    display: string;
  };
  comparison: {
    text: string;
    percentage: number;
    trend: 'slower' | 'faster';
  };
}
