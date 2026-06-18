import { ResearcherParticipantsData } from '../interfaces/researcher.interface';

const SCHOLARSHIP_LABELS: Record<string, string> = {
  NONE: 'Nenhuma',
  FUNDAMENTAL_INCOMPLETE: 'Ensino Fundamental Incompleto',
  FUNDAMENTAL_COMPLETE: 'Ensino Fundamental Completo',
  HIGH_SCHOOL_INCOMPLETE: 'Ensino Médio Incompleto',
  HIGH_SCHOOL_COMPLETE: 'Ensino Médio Completo',
  HIGHER_EDUCATION_INCOMPLETE: 'Ensino Superior Completo',
  HIGHER_EDUCATION_COMPLETE: 'Ensino Superior Incompleto',
  POSTGRADUATE: 'Pós-graduação',
  MASTERS: 'Mestrado',
  DOCTORATE: 'Doutorado',
};

export const getEducationLevel = (
  participants: ResearcherParticipantsData[],
) => {
  const grouped = new Map<string, number>();

  participants.forEach((participant) => {
    const label =
      SCHOLARSHIP_LABELS[participant.scholarship] ?? participant.scholarship;

    grouped.set(label, (grouped.get(label) ?? 0) + 1);
  });

  return [...grouped.entries()].map(([label, value]) => ({
    label,
    value,
  }));
};
