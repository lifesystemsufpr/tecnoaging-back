import { ResearcherEvaluationsData } from '../interfaces/researcher.interface';

type ParticipantsPerUbs = {
  ubs: string;
  absolute: number;
  percentage: number;
};

type ParticipantUbsStats = {
  count: number;
  lastEvaluationAt: number;
};

export const getParticipantsPerUbs = (
  evaluations: ResearcherEvaluationsData[],
  activeParticipants: number,
): ParticipantsPerUbs[] => {
  // 1) Agrupa avaliações por participante
  const evaluationsByParticipant = new Map<
    string,
    ResearcherEvaluationsData[]
  >();

  for (const evaluation of evaluations) {
    if (!evaluationsByParticipant.has(evaluation.participantId)) {
      evaluationsByParticipant.set(evaluation.participantId, []);
    }

    evaluationsByParticipant.get(evaluation.participantId)!.push(evaluation);
  }

  // 2) Define a UBS principal de cada participante
  const participantsByUbs = new Map<string, number>();

  for (const [, participantEvaluations] of evaluationsByParticipant) {
    const ubsStats = new Map<string, ParticipantUbsStats>();

    for (const evaluation of participantEvaluations) {
      const ubs = evaluation.healthcareUnit.name;
      const createdAt = new Date(evaluation.date).getTime();

      const current = ubsStats.get(ubs);

      if (!current) {
        ubsStats.set(ubs, {
          count: 1,
          lastEvaluationAt: createdAt,
        });
        continue;
      }

      ubsStats.set(ubs, {
        count: current.count + 1,
        lastEvaluationAt: Math.max(current.lastEvaluationAt, createdAt),
      });
    }

    // 3) Escolhe a UBS vencedora:
    //    - maior quantidade de avaliações
    //    - em caso de empate, avaliação mais recente
    let selectedUbs = '';
    let selectedCount = -1;
    let selectedLastEvaluationAt = -1;

    for (const [ubs, stats] of ubsStats.entries()) {
      const isBetterCount = stats.count > selectedCount;
      const isTieAndMoreRecent =
        stats.count === selectedCount &&
        stats.lastEvaluationAt > selectedLastEvaluationAt;

      if (isBetterCount || isTieAndMoreRecent) {
        selectedUbs = ubs;
        selectedCount = stats.count;
        selectedLastEvaluationAt = stats.lastEvaluationAt;
      }
    }

    participantsByUbs.set(
      selectedUbs,
      (participantsByUbs.get(selectedUbs) ?? 0) + 1,
    );
  }

  // 4) Monta saída com percentual
  return [...participantsByUbs.entries()]
    .map(([ubs, absolute]) => ({
      ubs,
      absolute,
      percentage:
        activeParticipants > 0
          ? Number(((absolute / activeParticipants) * 100).toFixed(2))
          : 0,
    }))
    .sort((a, b) => b.absolute - a.absolute);
};
