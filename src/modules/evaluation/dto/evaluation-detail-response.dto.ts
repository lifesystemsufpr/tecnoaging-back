export class SensorAxisStats {
  min: number;
  max: number;
  mean: number;
}

export class SensorBlock {
  format: string;
  columns: string[];
  units: Record<string, string>;
  samplingHz: number;
  resolution: number;
  downsampled: boolean;
  method: string;
  originalSampleCount: number;
  stats: Record<string, SensorAxisStats>;
}

export class CycleData {
  total: number;
  stand: number;
  sit: number;
}

export class CycleBlock {
  [key: string]: CycleData;
  min: CycleData;
  max: CycleData;
  avg: CycleData;
}

export class Indicator {
  name: string;
  value: number;
  maxValue: number;
  classification: string;
}

export class DerivedBlock {
  patientAgeOnEvaluation: number;
  indicators: Indicator[];
  overallClassification: string;
}

export class EvaluationResponse {
  sensor: SensorBlock;
  derived: DerivedBlock;
  cycle: CycleBlock;
}
