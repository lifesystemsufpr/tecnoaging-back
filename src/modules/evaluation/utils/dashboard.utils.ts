import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export interface YearMonth {
  year: number;
  month: number;
}

export function getCurrentMonthAndYear(timezone: string): YearMonth {
  const now = new Date();
  const month = Number(formatInTimeZone(now, timezone, 'M'));
  const year = Number(formatInTimeZone(now, timezone, 'yyyy'));
  return { month, year };
}

export function getCurrentMonthRangeUtc(timezone: string) {
  const { month, year } = getCurrentMonthAndYear(timezone);
  return {
    startUtc: getMonthStartUtc(year, month, timezone),
    endUtc: getMonthStartUtc(year, month + 1, timezone),
  };
}

export function getMonthStartUtc(
  year: number,
  month: number,
  timezone: string,
): Date {
  let normalizedYear = year;
  let normalizedMonth = month;

  if (normalizedMonth <= 0) {
    const offset = Math.ceil(Math.abs(normalizedMonth) / 12);
    normalizedYear -= offset;
    normalizedMonth += 12 * offset;
  }

  if (normalizedMonth > 12) {
    normalizedYear += Math.floor((normalizedMonth - 1) / 12);
    normalizedMonth = ((normalizedMonth - 1) % 12) + 1;
  }

  const paddedMonth = normalizedMonth.toString().padStart(2, '0');
  const localDateString = `${normalizedYear}-${paddedMonth}-01T00:00:00`;

  return fromZonedTime(localDateString, timezone);
}

export function getLastTwelveMonths(timezone: string): YearMonth[] {
  const { month: currentMonth, year: currentYear } =
    getCurrentMonthAndYear(timezone);
  const result: YearMonth[] = [];

  for (let offset = 12; offset >= 0; offset--) {
    const monthIndex = currentMonth - offset;
    const date = new Date(Date.UTC(currentYear, monthIndex - 1, 1));
    result.push({
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
    });
  }

  return result;
}

export function buildMonthKey(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, '0')}`;
}

export function calculateAverageCount(values: number[]): number {
  if (!values.length) return 0;

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
}

export function getPreviousMonthRangeUtc(timezone: string) {
  const { month, year } = getCurrentMonthAndYear(timezone);
  return {
    startUtc: getMonthStartUtc(year, month - 1, timezone),
    endUtc: getMonthStartUtc(year, month, timezone),
  };
}

export function computePercentageChange(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

export function computeTrend(
  percentageChange: number | null,
): 'up' | 'down' | 'stable' {
  if (percentageChange === null || Math.abs(percentageChange) < 5)
    return 'stable';
  return percentageChange >= 5 ? 'up' : 'down';
}
