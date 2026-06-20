export interface ResearcherParticipantsData {
  socio_economic_level: string;
  scholarship: string;
  birthday: Date;
  active: true;
  user: {
    gender: string;
  };
}

export interface ResearcherEvaluationsData {
  id: string;
  participantId: string;
  date: Date;
  type: string;
  healthcareUnit: {
    id: string;
    name: string;
  };
}
