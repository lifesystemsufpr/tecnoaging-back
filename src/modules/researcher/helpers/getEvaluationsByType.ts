import { ResearcherEvaluationsData } from '../interfaces/researcher.interface';

type EvaluationsByTestTypeItem = {
  label: string;
  percentage: number;
  absolute: number;
};

export const getEvaluationsByTestType = (
  evaluations: ResearcherEvaluationsData[],
): EvaluationsByTestTypeItem[] => {
  const total = evaluations.length;

  const grouped = new Map<string, number>();

  for (const evaluation of evaluations) {
    const type = evaluation.type ?? 'UNKNOWN';
    grouped.set(type, (grouped.get(type) ?? 0) + 1);
  }

  return [...grouped.entries()]
    .map(([type, absolute]) => ({
      label: type,
      absolute,
      percentage: total > 0 ? Number(((absolute / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.absolute - a.absolute);
}
