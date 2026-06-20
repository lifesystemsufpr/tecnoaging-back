import { ResearcherEvaluationsData } from '../interfaces/researcher.interface';

type ParticipantsPerUbs = {
  ubs: string;
  absolute: number;
  percentage: number;
};

//@TODO: verificar se o cálculo deve ser feito com base no total de participantes cadastrados ou que realizaram testes
export const getParticipantsPerUbs = (
  evaluations: ResearcherEvaluationsData[],
  totalParticipants: number,
): ParticipantsPerUbs[] => {
  const grouped = new Map<string, Set<string>>();

  for (const evaluation of evaluations) {
    const ubs = evaluation.healthcareUnit.name;

    if (!grouped.has(ubs)) {
      grouped.set(ubs, new Set());
    }

    grouped.get(ubs)!.add(evaluation.participantId);
  }

  const totalUniqueParticipants = new Set(
    evaluations.map((e) => e.participantId),
  ).size;

  return [...grouped.entries()]
    .map(([ubs, participants]) => ({
      ubs,
      absolute: participants.size,
      percentage: Number(
        ((participants.size / totalUniqueParticipants) * 100).toFixed(2),
      ),
    }))
    .sort((a, b) => b.absolute - a.absolute);
};
