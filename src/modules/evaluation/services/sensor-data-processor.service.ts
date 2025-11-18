// src/modules/evaluation/services/sensor-data-processor.service.ts

import { Injectable } from '@nestjs/common';
import { SensorData } from '@prisma/client';
import {
  CycleBlock,
  CycleData,
  DerivedBlock,
  DerivedIndicator,
  SensorAxisStats,
  SensorBlock,
} from '../dto/evaluation-detail-response.dto';

type MovementState = 'SITTING' | 'STANDING_UP' | 'STANDING' | 'SITTING_DOWN';

interface IThresholds {
  UP: number;
  DOWN: number;
  STABLE: number;
}

interface IDetectionState {
  cycles: CycleData[];
  currentState: MovementState;
  currentCycle: number;
  cycleStartTime: number | null;
  subirStartTime: number | null;
  descerStartTime: number | null;
}

@Injectable()
export class SensorDataProcessorService {
  detectCycles(sensorData: SensorData[]): CycleBlock {
    const sortedData = [...sensorData].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const thresholds: IThresholds = {
      UP: 0.5,
      DOWN: -0.3,
      STABLE: 0.1,
    };

    const state: IDetectionState = {
      cycles: [],
      currentState: 'SITTING',
      currentCycle: 0,
      cycleStartTime: null,
      subirStartTime: null,
      descerStartTime: null,
    };

    for (const dataPoint of sortedData) {
      if (state.currentCycle >= 5) break;
      this.processDataPoint(dataPoint, state, thresholds);
    }

    while (state.cycles.length < 5) {
      state.cycles.push({ TOT: 0, SUBIR: 0, DESCER: 0 });
    }

    const minCycle = this.calculateMinCycle(state.cycles);
    const maxCycle = this.calculateMaxCycle(state.cycles);

    return {
      C1: state.cycles[0],
      C2: state.cycles[1],
      C3: state.cycles[2],
      C4: state.cycles[3],
      C5: state.cycles[4],
      MIN: minCycle,
      MAX: maxCycle,
    };
  }

  private processDataPoint(
    dataPoint: SensorData,
    state: IDetectionState,
    thresholds: IThresholds,
  ) {
    const accelY = dataPoint.accel_y;
    const timestamp = dataPoint.timestamp.getTime();

    switch (state.currentState) {
      case 'SITTING': {
        const sitResult = this.handleSittingState(
          accelY,
          timestamp,
          state.cycleStartTime,
          thresholds,
        );
        if (sitResult) {
          state.currentState = 'STANDING_UP';
          state.subirStartTime = sitResult.subirStartTime;
          state.cycleStartTime = sitResult.cycleStartTime;
        }
        break;
      }

      case 'STANDING_UP':
        if (this.handleStandingUpState(accelY, thresholds)) {
          state.currentState = 'STANDING';
        }
        break;

      case 'STANDING':
        if (this.handleStandingState(accelY, timestamp, thresholds)) {
          state.currentState = 'SITTING_DOWN';
          state.descerStartTime = timestamp;
        }
        break;

      case 'SITTING_DOWN': {
        const sitDownResult = this.handleSittingDownState(
          accelY,
          timestamp,
          state.cycleStartTime,
          state.subirStartTime,
          state.descerStartTime,
          thresholds,
        );
        if (sitDownResult) {
          state.currentState = 'SITTING';
          state.currentCycle++;
          state.cycles.push(sitDownResult.cycle);

          state.cycleStartTime = timestamp;
          state.subirStartTime = null;
          state.descerStartTime = null;
        }
        break;
      }
    }
  }

  private handleSittingState(
    accelY: number,
    timestamp: number,
    cycleStartTime: number | null,
    thresholds: IThresholds,
  ) {
    if (accelY > thresholds.UP) {
      return {
        subirStartTime: timestamp,
        cycleStartTime: cycleStartTime === null ? timestamp : cycleStartTime,
      };
    }
    return null;
  }

  private handleStandingUpState(accelY: number, thresholds: IThresholds) {
    return Math.abs(accelY) < thresholds.STABLE;
  }

  private handleStandingState(
    accelY: number,
    timestamp: number,
    thresholds: IThresholds,
  ) {
    return accelY < thresholds.DOWN;
  }

  private handleSittingDownState(
    accelY: number,
    timestamp: number,
    cycleStartTime: number | null,
    subirStartTime: number | null,
    descerStartTime: number | null,
    thresholds: IThresholds,
  ) {
    if (Math.abs(accelY) < thresholds.STABLE) {
      const subirTime =
        subirStartTime && descerStartTime
          ? (descerStartTime - subirStartTime) / 1000
          : 0;
      const descerTime = descerStartTime
        ? (timestamp - descerStartTime) / 1000
        : 0;
      const totalTime = cycleStartTime
        ? (timestamp - cycleStartTime) / 1000
        : 0;

      const cycle: CycleData = {
        TOT: totalTime,
        SUBIR: subirTime,
        DESCER: descerTime,
      };
      return { cycle };
    }
    return null;
  }

  processSensorData(sensorData: SensorData[]): SensorBlock {
    const sortedData = [...sensorData].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const columns = ['T', 'ax', 'ay', 'az', 'gx', 'gy', 'gz'];

    const data = sortedData.map((sensor) => [
      sensor.timestamp.getTime(),
      sensor.accel_x,
      sensor.accel_y,
      sensor.accel_z,
      sensor.gyro_x,
      sensor.gyro_y,
      sensor.gyro_z,
    ]);

    const stats = this.calculateSensorStats(sortedData);

    return {
      format: 'Cd',
      Column: columns,
      Data: data,
      STATS: stats,
    };
  }

  calculateDerivedIndicators(
    cycleBlock: CycleBlock,
    timeInit: Date,
    timeEnd: Date,
  ): DerivedBlock {
    const cycles = [
      cycleBlock.C1,
      cycleBlock.C2,
      cycleBlock.C3,
      cycleBlock.C4,
      cycleBlock.C5,
    ].filter((c) => c.TOT > 0);

    const indicators: DerivedIndicator[] = [];

    const tempoTotalTeste = (timeEnd.getTime() - timeInit.getTime()) / 1000;
    indicators.push({ NAME: 'TEMPO_TOTAL_TESTE', VALUE: tempoTotalTeste });
    indicators.push({ NAME: 'TEMPO', VALUE: tempoTotalTeste });

    if (cycles.length > 0) {
      const tempoMedioCiclo =
        cycles.reduce((sum, cycle) => sum + cycle.TOT, 0) / cycles.length;
      indicators.push({ NAME: 'TEMPO_MEDIO_CICLO', VALUE: tempoMedioCiclo });

      const tempoMedioSubir =
        cycles.reduce((sum, cycle) => sum + cycle.SUBIR, 0) / cycles.length;
      indicators.push({ NAME: 'TEMPO_MEDIO_SUBIR', VALUE: tempoMedioSubir });

      const tempoMedioDescer =
        cycles.reduce((sum, cycle) => sum + cycle.DESCER, 0) / cycles.length;
      indicators.push({ NAME: 'TEMPO_MEDIO_DESCER', VALUE: tempoMedioDescer });
    } else {
      indicators.push({ NAME: 'TEMPO_MEDIO_CICLO', VALUE: 0 });
      indicators.push({ NAME: 'TEMPO_MEDIO_SUBIR', VALUE: 0 });
      indicators.push({ NAME: 'TEMPO_MEDIO_DESCER', VALUE: 0 });
    }

    return {
      INDICATORS: indicators,
    };
  }

  private calculateSensorStats(sensorData: SensorData[]): SensorBlock['STATS'] {
    const stats: Record<string, SensorAxisStats> = {};

    const axisMap = {
      ax: 'accel_x',
      ay: 'accel_y',
      az: 'accel_z',
      gx: 'gyro_x',
      gy: 'gyro_y',
      gz: 'gyro_z',
    } as const;

    for (const [axisName, dataKey] of Object.entries(axisMap)) {
      const values = sensorData.map((sensor) => sensor[dataKey]);

      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

        stats[axisName] = { MIN: min, MAX: max, MEAN: mean };
      }
    }
    return stats;
  }

  private calculateMinCycle(cycles: CycleData[]): CycleData {
    if (cycles.length === 0) return { TOT: 0, SUBIR: 0, DESCER: 0 };

    const validCycles = cycles.filter((c) => c.TOT > 0);
    if (validCycles.length === 0) return { TOT: 0, SUBIR: 0, DESCER: 0 };

    return {
      TOT: Math.min(...validCycles.map((c) => c.TOT)),
      SUBIR: Math.min(...validCycles.map((c) => c.SUBIR)),
      DESCER: Math.min(...validCycles.map((c) => c.DESCER)),
    };
  }

  private calculateMaxCycle(cycles: CycleData[]): CycleData {
    if (cycles.length === 0) return { TOT: 0, SUBIR: 0, DESCER: 0 };

    return {
      TOT: Math.max(...cycles.map((c) => c.TOT)),
      SUBIR: Math.max(...cycles.map((c) => c.SUBIR)),
      DESCER: Math.max(...cycles.map((c) => c.DESCER)),
    };
  }
}
