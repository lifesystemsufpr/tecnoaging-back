import { ResearcherEvaluationsData } from '../interfaces/researcher.interface';

export const getEvaluationsByHealthcareUnit = (
  evaluations: ResearcherEvaluationsData[],
) => {
  const grouped = evaluations.reduce(
    (acc, evaluation) => {
      const institution = evaluation.healthcareUnit.name;

      acc[institution] = (acc[institution] ?? 0) + 1;

      return acc;
    },
    {} as Record<string, number>,
  );

  return Object.entries(grouped).map(([institution, evaluations]) => ({
    institution,
    evaluations,
  }));
};
