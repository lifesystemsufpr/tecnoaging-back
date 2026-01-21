import { ApiProperty } from '@nestjs/swagger';

// --- Classes para Sensor (Dados Brutos/Grafico de Sensores) ---

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

// --- Classes para Ciclos (Lista de Repetições) ---

export class CycleDetailDto {
  @ApiProperty({ description: 'Número do ciclo/repetição' })
  cycle: number;

  @ApiProperty({ description: 'Tempo total do ciclo em segundos' })
  totalTime: number;

  @ApiProperty({ description: 'Tempo para levantar em segundos' })
  standUpTime: number;

  @ApiProperty({ description: 'Tempo para sentar em segundos' })
  sitDownTime: number;

  @ApiProperty({ description: 'Potência média (Watts)' })
  power: number;

  @ApiProperty({ description: 'Velocidade de extensão (°/s)' })
  velocityExtension: number;

  @ApiProperty({ description: 'Velocidade de flexão (°/s)' })
  velocityFlexion: number;
}

// --- Classes para Curva Processada (Ângulo do Tronco) ---

export class ProcessedPointDto {
  @ApiProperty({ description: 'Tempo (s)' }) t: number;
  @ApiProperty({ description: 'Valor (graus)' }) val: number;
}

export class ProcessedBlockDto {
  @ApiProperty({ type: [ProcessedPointDto] })
  data: ProcessedPointDto[];

  @ApiProperty({ example: 'Ângulo do Tronco' }) label: string;
  @ApiProperty({ example: '°' }) unit: string;
}

// --- Classes para Indicadores e Derivados (Resumo) ---

export class Indicator {
  @ApiProperty() name: string;
  @ApiProperty() value: number;
  @ApiProperty() maxValue: number;
  @ApiProperty() classification: string;
  @ApiProperty({ required: false }) unit?: string;
}

export class DerivedBlock {
  @ApiProperty() participantAgeOnEvaluation: number;
  @ApiProperty({ type: [Indicator] }) indicators: Indicator[];
  @ApiProperty() overallClassification: string;
}

// --- DTO Principal de Resposta ---

export class EvaluationResponse {
  @ApiProperty({ type: SensorBlock })
  sensor: SensorBlock;

  @ApiProperty({
    type: ProcessedBlockDto,
    description: 'Dados processados (ex: curva de ângulo)',
  })
  processed: ProcessedBlockDto;

  @ApiProperty({ type: DerivedBlock })
  derived: DerivedBlock;

  @ApiProperty({
    type: [CycleDetailDto],
    description: 'Detalhes de cada repetição',
  })
  cycles: CycleDetailDto[];
}
