export interface IvcfDomainScores {
  age: number;
  selfPerception: number;
  functionalCapacity: number;
  cognition: number;
  mood: number;
  mobility: number;
  communication: number;
  comorbidities: number;
}

export type FrailtyClassification = 'Robusto' | 'Pré-frágil' | 'Frágil';

export interface IVCF_DomainScores {
  age: number;
  selfPerception: number;
  functionalCapacity: number;
  cognition: number;
  mood: number;
  mobility: number;
  communication: number;
  comorbidities: number;
}

export interface IVCF_Assessment {
  id: string;
  date: string;
  createdAt: string;
  totalScore: number;
  riskLevel: FrailtyClassification;
  classification: FrailtyClassification;
  domains: IVCF_DomainScores;
  rawResponses: Record<string, string>;
}

export interface Daily_Assessment {
  date: string;
  hasMultipleAssessments: boolean;
  assessments: IVCF_Assessment[];
}

export interface ParticipantEvolutionDailyData {
  participantId: string;
  participantName: string;
  dailyAssessments: Daily_Assessment[];
}

export interface IvcfAssessment {
  id: string;
  date: string;
  totalScore: number;
  riskLevel: string;
  domains: IvcfDomainScores;
  rawResponses: Record<string, string>;
}

export interface ParticipantEvolutionResponse {
  participantId: string;
  participantName: string;
  assessments: IvcfAssessment[];
}

export interface ParticipantSummaryResponse {
  participantId: string;
  participantName: string;
  totalAssessments: number;
  lastAssessment: {
    id: string;
    date: string;
    totalScore: number;
    riskLevel: string;
    domains: IvcfDomainScores;
  } | null;
}

export interface ScoreHistoryItem {
  id: string;
  date: string;
  totalScore: number;
  riskLevel: string;
}

export interface ScoreHistoryResponse {
  participantId: string;
  participantName: string;
  scores: ScoreHistoryItem[];
}

export interface DomainHistoryItem {
  id: string;
  date: string;
  domains: IvcfDomainScores;
}

export interface DomainHistoryResponse {
  participantId: string;
  participantName: string;
  history: DomainHistoryItem[];
}

export interface AssessmentDetailResponse {
  id: string;
  date: string;
  totalScore: number;
  riskLevel: string;
  domains: IvcfDomainScores;
  rawResponses: Record<string, string>;
}
