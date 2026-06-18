import { ResearcherEvaluationsData } from '../interfaces/researcher.interface';

//@TODO: verificar se o cálculo deve ser feito com base no total de participantes cadastrados ou que realizaram testes
export const getParticipantsPerUbs = (
  evaluations: ResearcherEvaluationsData[],
  totalParticipants: number,
) => {
  const grouped = new Map<string, Set<string>>();

  for (const evaluation of evaluations) {
    const ubs = evaluation.healthcareUnit.name;

    if (!grouped.has(ubs)) {
      grouped.set(ubs, new Set());
    }

    grouped.get(ubs)!.add(evaluation.participantId);
  }

  // const totalUniqueParticipants = new Set(
  //   evaluations.map((e) => e.participantId),
  // ).size;

  return [...grouped.entries()]
    .map(([ubs, participants]) => ({
      ubs,
      absolute: participants.size,
      percentage: Number(
        ((participants.size / totalParticipants) * 100).toFixed(2),
      ),
    }))
    .sort((a, b) => b.absolute - a.absolute);
};
