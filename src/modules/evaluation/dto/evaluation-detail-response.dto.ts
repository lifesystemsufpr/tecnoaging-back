import { ApiProperty } from '@nestjs/swagger';

/**
 * Estatisticas de um eixo do sensor
 */
export class SensorAxisStats {
  @ApiProperty({ example: 0.1 })
  MIN: number;

  @ApiProperty({ example: 0.12 })
  MAX: number;

  @ApiProperty({ example: 0.11 })
  MEAN: number;
}

/**
 * Bloco SENSOR
 */
export class SensorBlock {
  @ApiProperty({ example: 'Cd' })
  format: string;

  @ApiProperty({
    example: ['T', 'ax', 'ay', 'az', 'gx', 'gy', 'gz'],
    description: 'Nomes das colunas dos dados do sensor',
  })
  Column: string[];

  @ApiProperty({
    example: [
      [173966, 0.1, 0.2, 0.5, 1.7, 0.3, 0.4],
      [173967, 0.12, 0.21, 0.51, 1.71, 0.31, 0.41],
    ],
    description: 'Array de arrays com os dados do sensor [timestamp, ...eixos]',
  })
  Data: (number | Date)[][];

  @ApiProperty({
    example: {
      ax: { MIN: 0.1, MAX: 0.12, MEAN: 0.11 },
      ay: { MIN: 0.2, MAX: 0.2, MEAN: 0.15 },
      az: { MIN: 0.5, MAX: 0.51, MEAN: 0.505 },
      gx: { MIN: 1.7, MAX: 1.71, MEAN: 1.705 },
      gy: { MIN: 0.3, MAX: 0.31, MEAN: 0.305 },
      gz: { MIN: 0.4, MAX: 0.41, MEAN: 0.405 },
    },
    description: 'Estatisticas calculadas para cada eixo do sensor',
  })
  STATS: {
    ax?: SensorAxisStats;
    ay?: SensorAxisStats;
    az?: SensorAxisStats;
    gx?: SensorAxisStats;
    gy?: SensorAxisStats;
    gz?: SensorAxisStats;
  };
}

/**
 * Dados de um ciclo individual
 */
export class CycleData {
  @ApiProperty({ example: 15, description: 'Tempo total do ciclo em segundos' })
  TOT: number;

  @ApiProperty({
    example: 10,
    description: 'Tempo de levantar (SUBIR) em segundos',
  })
  SUBIR: number;

  @ApiProperty({
    example: 5,
    description: 'Tempo de sentar (DESCER) em segundos',
  })
  DESCER: number;
}

/**
 * Bloco CYCLE
 */
export class CycleBlock {
  @ApiProperty({ example: { TOT: 15, SUBIR: 10, DESCER: 5 } })
  C1: CycleData;

  @ApiProperty({ example: { TOT: 14, SUBIR: 9, DESCER: 5 } })
  C2: CycleData;

  @ApiProperty({ example: { TOT: 16, SUBIR: 11, DESCER: 5 } })
  C3: CycleData;

  @ApiProperty({ example: { TOT: 15, SUBIR: 10, DESCER: 5 } })
  C4: CycleData;

  @ApiProperty({ example: { TOT: 17, SUBIR: 12, DESCER: 5 } })
  C5: CycleData;

  @ApiProperty({ example: { TOT: 14, SUBIR: 9, DESCER: 5 } })
  MIN: CycleData;

  @ApiProperty({ example: { TOT: 17, SUBIR: 12, DESCER: 5 } })
  MAX: CycleData;
}

/**
 * Indicador derivado
 */
export class DerivedIndicator {
  @ApiProperty({ example: 'TEMPO', description: 'Nome do indicador' })
  NAME: string;

  @ApiProperty({ example: 18, description: 'Valor do indicador' })
  VALUE: number;
}

/**
 * Bloco DERIVED
 */
export class DerivedBlock {
  @ApiProperty({
    example: [
      { NAME: 'TEMPO', VALUE: 18 },
      { NAME: 'TEMPO MEDIO CICLO', VALUE: 15.4 },
      { NAME: 'TEMPO TOTAL TESTE', VALUE: 77 },
    ],
    description: 'Array de indicadores derivados calculados',
  })
  INDICATORS: DerivedIndicator[];
}

/**
 * Resposta completa da avaliação detalhada
 */
export class EvaluationDetailResponseDto {
  @ApiProperty({ description: 'ID da avaliação' })
  id: string;

  @ApiProperty({ description: 'Dados do sensor formatados' })
  SENSOR: SensorBlock;

  @ApiProperty({ description: 'Dados dos ciclos calculados' })
  CYCLE: CycleBlock;

  @ApiProperty({ description: 'Indicadores derivados' })
  DERIVED: DerivedBlock;
}
