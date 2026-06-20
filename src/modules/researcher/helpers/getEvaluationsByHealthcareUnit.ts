import { ResearcherEvaluationsData } from '../interfaces/researcher.interface';

type EvaluationsByHealthcareUnit = {
  institution: string;
  evaluations: number;
}

export const getEvaluationsByHealthcareUnit = (
  evaluations: ResearcherEvaluationsData[],
): EvaluationsByHealthcareUnit[] => {
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
