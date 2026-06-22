import { ApiProperty } from '@nestjs/swagger';

// --- Sensor (dados brutos / gráfico de sensores) — compartilhado ---

export class SensorAxisStats {
  @ApiProperty() min: number;
  @ApiProperty() max: number;
  @ApiProperty() mean: number;
}

export class SensorBlock {
  @ApiProperty() format: string;
  @ApiProperty({ type: [String] }) columns: string[];
  @ApiProperty() units: Record<string, string>;
  @ApiProperty() samplingHz: number;
  @ApiProperty() resolution: number;
  @ApiProperty() downsampled: boolean;
  @ApiProperty() method: string;
  @ApiProperty() originalSampleCount: number;

  @ApiProperty({
    description: 'Matriz de dados do sensor [tempo, ax, ay, az, gx, gy, gz]',
    type: 'array',
    items: { type: 'array', items: { type: 'number' } },
  })
  data: number[][];

  @ApiProperty() stats: Record<string, SensorAxisStats>;
}

// --- Curva processada (timeseries) — compartilhado ---

export class ProcessedPointDto {
  @ApiProperty({ description: 'Tempo (s)' }) t: number;
  @ApiProperty({ description: 'Valor (graus para STS, °/s para STEP)' })
  val: number;
}

export class ProcessedBlockDto {
  @ApiProperty({ type: [ProcessedPointDto] })
  data: ProcessedPointDto[];

  @ApiProperty({ example: 'Ângulo do Tronco' }) label: string;
  @ApiProperty({ example: '°' }) unit: string;
}

// --- Indicadores em formato de "card" (usado no bloco derived do STS) ---

export class Indicator {
  @ApiProperty() name: string;
  @ApiProperty() value: number;
  @ApiProperty() maxValue: number;
  @ApiProperty() classification: string;
  @ApiProperty({ required: false }) unit?: string;
}

// ===================================================================
// STS (FTSTS / TTSTS) — 5x e 30x sentar-levantar
// ===================================================================

export class StsCycleDto {
  @ApiProperty({ description: 'Número do ciclo/repetição' }) cycle: number;
  @ApiProperty({ description: 'Tempo total do ciclo (s)' }) totalTime: number;
  @ApiProperty({ description: 'Tempo para levantar (s)' }) standUpTime: number;
  @ApiProperty({ description: 'Tempo para sentar (s)' }) sitDownTime: number;
  @ApiProperty({ description: 'Frequência (Hz)' }) frequency: number;
  @ApiProperty({ description: 'Transição em pé (s)' })
  transitionStandUp: number;
  @ApiProperty({ description: 'Transição sentado (s)' })
  transitionSitDown: number;
  @ApiProperty({ description: 'Vel. flexão ao levantar (°/s)' })
  velocityFlexionStandUp: number;
  @ApiProperty({ description: 'Vel. extensão ao levantar (°/s)' })
  velocityExtension: number;
  @ApiProperty({ description: 'Vel. flexão ao sentar (°/s)' })
  velocityFlexion: number;
  @ApiProperty({ description: 'Vel. extensão ao sentar (°/s)' })
  velocityExtensionSitDown: number;
  @ApiProperty({ description: 'Tempo do pico 1 (s)' }) peak1Time: number;
  @ApiProperty({ description: 'Tempo do pico 2 (s)' }) peak2Time: number;
  @ApiProperty({ description: 'Valor do pico 1 (°)' }) peak1Value: number;
  @ApiProperty({ description: 'Valor do pico 2 (°)' }) peak2Value: number;
  @ApiProperty({ description: 'Potência média do ciclo (J/s)' }) power: number;
}

export class StsDerivedBlock {
  @ApiProperty() participantAgeOnEvaluation: number;
  @ApiProperty({
    type: [Indicator],
    description:
      'Repetitions, Power, Total Energy e Total Time (tempo total acumulado)',
  })
  indicators: Indicator[];
  @ApiProperty() overallClassification: string;
}

export class StsDetailedResponse {
  @ApiProperty({ enum: ['STS'], example: 'STS' })
  kind: 'STS';

  @ApiProperty({ type: SensorBlock })
  sensor: SensorBlock;

  @ApiProperty({
    type: ProcessedBlockDto,
    description: 'Curva de ângulo do tronco (°)',
  })
  processed: ProcessedBlockDto;

  @ApiProperty({ type: StsDerivedBlock })
  derived: StsDerivedBlock;

  @ApiProperty({ type: [StsCycleDto], description: 'Detalhe de cada ciclo' })
  cycles: StsCycleDto[];
}

// ===================================================================
// STEP (TMSTS) — marcha estacionária de 2 minutos
// ===================================================================

export class StepGlobalMetricsDto {
  @ApiProperty({ description: 'Número de passos detectados' }) nSteps: number;
  @ApiProperty({
    description: 'ascending | descending | constant | undefined',
  })
  strategy: string;
  @ApiProperty({ description: 'Cadência (ciclos/min)' }) cadence: number;
  @ApiProperty({ nullable: true, description: 'Vel. média 0–20s (°/s)' })
  velInitial: number | null;
  @ApiProperty({ nullable: true, description: 'Vel. média 100–120s (°/s)' })
  velFinal: number | null;
  @ApiProperty({ nullable: true, description: 'Δ velocidade (°/s)' })
  deltaVel: number | null;
  @ApiProperty({ nullable: true, description: 'Inclinação (°/s²)' })
  slope: number | null;
  @ApiProperty({ description: 'Vel. média global (°/s)' }) velMean: number;
  @ApiProperty({ description: 'Desvio-padrão da velocidade (°/s)' })
  velStd: number;
  @ApiProperty({ description: 'Coef. de variação da velocidade' })
  cvVel: number;
  @ApiProperty({ description: 'Vel. máxima (°/s)' }) velMax: number;
  @ApiProperty({ description: 'Vel. mínima (°/s)' }) velMin: number;
  @ApiProperty({ nullable: true, description: 'Tempo médio entre passos (s)' })
  timeMean: number | null;
  @ApiProperty({ nullable: true, description: 'Desvio-padrão do tempo (s)' })
  timeStd: number | null;
  @ApiProperty({ nullable: true, description: 'Coef. de variação do tempo' })
  cvTime: number | null;
  @ApiProperty({ nullable: true, description: 'Tempo máximo entre passos (s)' })
  timeMax: number | null;
  @ApiProperty({ nullable: true, description: 'Tempo mínimo entre passos (s)' })
  timeMin: number | null;
}

export class StepPeakDto {
  @ApiProperty({ description: 'Número do pico/passo' }) peak: number;
  @ApiProperty({ description: 'Tempo do pico (s)' }) time: number;
  @ApiProperty({ description: 'Vel. bruta (°/s)' }) rawVel: number;
  @ApiProperty({ description: 'Vel. eixo X do telefone (°/s)' })
  phoneXVel: number;
  @ApiProperty({ nullable: true, description: 'Vel. eixo Y do telefone (°/s)' })
  phoneYVel: number | null;
  @ApiProperty({ nullable: true, description: 'Vel. eixo Z do telefone (°/s)' })
  phoneZVel: number | null;
  @ApiProperty({ description: 'Vel. calibrada pelo modelo (°/s)' })
  calibratedVel: number;
}

export class StepDerivedBlock {
  @ApiProperty() participantAgeOnEvaluation: number;
  @ApiProperty({ type: StepGlobalMetricsDto })
  metrics: StepGlobalMetricsDto;
  @ApiProperty({ description: 'Estratégia de marcha' })
  overallClassification: string;
}

export class StepDetailedResponse {
  @ApiProperty({ enum: ['STEP'], example: 'STEP' })
  kind: 'STEP';

  @ApiProperty({ type: SensorBlock })
  sensor: SensorBlock;

  @ApiProperty({
    type: ProcessedBlockDto,
    description: 'Curva de velocidade angular (°/s)',
  })
  processed: ProcessedBlockDto;

  @ApiProperty({ type: StepDerivedBlock })
  derived: StepDerivedBlock;

  @ApiProperty({ type: [StepPeakDto], description: 'Detalhe de cada passo' })
  peaks: StepPeakDto[];
}
