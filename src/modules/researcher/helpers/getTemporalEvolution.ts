import { ResearcherEvaluationsData } from '../interfaces/researcher.interface';

type TemporalEvolutionItem = {
  period: string;
  value: number;
};

export const getTemporalEvolution = (
  evaluations: ResearcherEvaluationsData[],
): TemporalEvolutionItem[] => {
  const monthLabels = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ];

  const grouped = new Map<string, number>();

  for (const evaluation of evaluations) {
    const date = new Date(evaluation.date);

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const month = date.getMonth();
    const year = date.getFullYear();

    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const [year, month] = key.split('-');
      const monthIndex = Number(month) - 1;

      return {
        period: `${monthLabels[monthIndex]}/${year}`,
        value,
      };
    });
};
