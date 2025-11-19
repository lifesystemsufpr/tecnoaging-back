import { Injectable } from '@nestjs/common';
import { SensorData } from '@prisma/client';
import {
  CycleBlock,
  CycleData,
  DerivedBlock,
  EvaluationResponse,
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
  cycles: { tot: number; stand: number; sit: number }[];
  currentState: MovementState;
  currentCycle: number;
  cycleStartTime: number | null;
  standStartTime: number | null;
  sitStartTime: number | null;
}

@Injectable()
export class SensorDataProcessorService {
  processFullEvaluation(
    sensorData: SensorData[],
    timeInit: Date,
    timeEnd: Date,
    patientAge: number,
  ): EvaluationResponse {
    const sensorBlock = this.processSensorData(sensorData);
    const cycleBlock = this.detectCycles(sensorData);
    const derivedBlock = this.calculateDerivedIndicators(
      cycleBlock,
      timeInit,
      timeEnd,
      patientAge,
    );

    return {
      sensor: sensorBlock,
      derived: derivedBlock,
      cycle: cycleBlock,
    };
  }

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
      standStartTime: null,
      sitStartTime: null,
    };

    for (const dataPoint of sortedData) {
      this.processDataPoint(dataPoint, state, thresholds);
    }

    while (state.cycles.length < 5) {
      state.cycles.push({ tot: 0, stand: 0, sit: 0 });
    }

    const minCycle = this.calculateMinCycle(state.cycles);
    const maxCycle = this.calculateMaxCycle(state.cycles);
    const avgCycle = this.calculateAvgCycle(state.cycles);

    const response: CycleBlock = {
      min: { total: minCycle.tot, stand: minCycle.stand, sit: minCycle.sit },
      max: { total: maxCycle.tot, stand: maxCycle.stand, sit: maxCycle.sit },
      avg: { total: avgCycle.tot, stand: avgCycle.stand, sit: avgCycle.sit },
    };

    state.cycles.forEach((cycle, index) => {
      response[`C${index + 1}`] = {
        total: cycle.tot,
        stand: cycle.stand,
        sit: cycle.sit,
      };
    });

    return response;
  }

  processSensorData(sensorData: SensorData[]): SensorBlock {
    const sortedData = [...sensorData].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const columns = ['t', 'ax', 'ay', 'az', 'gx', 'gy', 'gz'];

    const data = sortedData.map((sensor) => [
      sensor.timestamp.getTime(),
      Number(sensor.accel_x),
      Number(sensor.accel_y),
      Number(sensor.accel_z),
      Number(sensor.gyro_x),
      Number(sensor.gyro_y),
      Number(sensor.gyro_z),
    ]);

    const stats = this.calculateSensorStats(sortedData);

    return {
      format: 'col',
      columns: columns,
      units: {
        t: 'ms',
        ax: 'g',
        ay: 'g',
        az: 'g',
        gx: 'rad/s',
        gy: 'rad/s',
        gz: 'rad/s',
      },
      samplingHz: 100,
      resolution: 1000,
      downsampled: true,
      method: 'LTTB',
      originalSampleCount: sortedData.length,
      data: data,
      stats: stats,
    };
  }

  calculateDerivedIndicators(
    cycleBlock: CycleBlock,
    timeInit: Date,
    timeEnd: Date,
    patientAge: number,
  ): DerivedBlock {
    const tempoTotalTeste = (timeEnd.getTime() - timeInit.getTime()) / 1000;

    const validCycles: CycleData[] = Object.keys(cycleBlock)
      .filter((key) => key.startsWith('C'))
      .map((key) => cycleBlock[key])
      .filter((c) => c.total > 0);

    const avgStandTime =
      validCycles.reduce((sum, c) => sum + c.stand, 0) /
        (validCycles.length || 1) || 1;
    const powerIndex = parseFloat((1 / avgStandTime).toFixed(2));

    let fatigueIndex = 0;
    if (validCycles.length >= 2) {
      const firstHalf = validCycles.slice(
        0,
        Math.floor(validCycles.length / 2),
      );
      const secondHalf = validCycles.slice(Math.floor(validCycles.length / 2));

      const avgTimeFirst =
        firstHalf.reduce((a, b) => a + b.total, 0) / firstHalf.length;
      const avgTimeSecond =
        secondHalf.reduce((a, b) => a + b.total, 0) / secondHalf.length;

      fatigueIndex = parseFloat(
        (((avgTimeSecond - avgTimeFirst) / avgTimeFirst) * 10).toFixed(2),
      );
    }

    const meanTotalTime =
      validCycles.reduce((sum, c) => sum + c.total, 0) /
      (validCycles.length || 1);
    const variance =
      validCycles.reduce(
        (sum, c) => sum + Math.pow(c.total - meanTotalTime, 2),
        0,
      ) / (validCycles.length || 1);
    const symmetryIndex = parseFloat(Math.sqrt(variance).toFixed(2));

    return {
      patientAgeOnEvaluation: patientAge,
      overallClassification: this.getOverallClassification(
        validCycles.length,
        patientAge,
      ),
      indicators: [
        {
          name: 'Tempo Total',
          value: parseFloat(tempoTotalTeste.toFixed(2)),
          maxValue: 60,
          classification: tempoTotalTeste <= 30 ? 'Normal' : 'Lento',
        },
        {
          name: 'Potência (Vel. Levante)',
          value: powerIndex,
          maxValue: 5.0,
          classification: this.classifyPower(powerIndex),
        },
        {
          name: 'Fadiga (Variação Temporal)',
          value: fatigueIndex,
          maxValue: 10,
          classification: this.classifyFatigue(fatigueIndex),
        },
        {
          name: 'Regularidade (Simetria)',
          value: symmetryIndex,
          maxValue: 5,
          classification: this.classifySymmetry(symmetryIndex),
        },
      ],
    };
  }

  private classifyPower(val: number): string {
    if (val > 1.5) return 'Excelente';
    if (val > 1.0) return 'Bom';
    if (val > 0.5) return 'Regular';
    return 'Baixo';
  }

  private classifyFatigue(val: number): string {
    if (val <= 0) return 'Ausente';
    if (val < 1.0) return 'Baixa';
    if (val < 2.0) return 'Média';
    return 'Alta';
  }

  private classifySymmetry(stdDev: number): string {
    if (stdDev < 0.5) return 'Excelente';
    if (stdDev < 1.0) return 'Bom';
    if (stdDev < 2.0) return 'Regular';
    return 'Irregular';
  }

  private getOverallClassification(cyclesCount: number, age: number): string {
    let target = 14;
    if (age > 70) target = 12;
    if (age > 80) target = 10;

    if (cyclesCount >= target) return 'Acima da Média';
    if (cyclesCount >= target - 3) return 'Na Média';
    return 'Abaixo da Média';
  }

  private processDataPoint(
    dataPoint: SensorData,
    state: IDetectionState,
    thresholds: IThresholds,
  ) {
    const accelY = Number(dataPoint.accel_y);
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
          state.standStartTime = sitResult.standStartTime;
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
          state.sitStartTime = timestamp;
        }
        break;
      case 'SITTING_DOWN': {
        const sitDownResult = this.handleSittingDownState(
          accelY,
          timestamp,
          state.cycleStartTime,
          state.standStartTime,
          state.sitStartTime,
          thresholds,
        );
        if (sitDownResult) {
          state.currentState = 'SITTING';
          state.currentCycle++;
          state.cycles.push(sitDownResult.cycle);

          state.cycleStartTime = timestamp;
          state.standStartTime = null;
          state.sitStartTime = null;
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
        standStartTime: timestamp,
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
    standStartTime: number | null,
    sitStartTime: number | null,
    thresholds: IThresholds,
  ) {
    if (Math.abs(accelY) < thresholds.STABLE) {
      const standTime =
        standStartTime && sitStartTime
          ? (sitStartTime - standStartTime) / 1000
          : 0;
      const sitTime = sitStartTime ? (timestamp - sitStartTime) / 1000 : 0;
      const totalTime = cycleStartTime
        ? (timestamp - cycleStartTime) / 1000
        : 0;

      return {
        cycle: {
          tot: totalTime,
          stand: standTime,
          sit: sitTime,
        },
      };
    }
    return null;
  }

  private calculateSensorStats(
    sensorData: SensorData[],
  ): Record<string, SensorAxisStats> {
    const stats: Record<string, SensorAxisStats> = {};

    const axisMap = {
      ax: 'accel_x',
      ay: 'accel_y',
      az: 'accel_z',
      gx: 'gyro_x',
      gy: 'gyro_y',
      gz: 'gyro_z',
    } as const;

    for (const [jsonKey, dbKey] of Object.entries(axisMap)) {
      const values = sensorData.map((sensor) => Number(sensor[dbKey]));

      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

        stats[jsonKey] = { min, max, mean };
      }
    }
    return stats;
  }

  private calculateMinCycle(
    cycles: { tot: number; stand: number; sit: number }[],
  ) {
    const validCycles = cycles.filter((c) => c.tot > 0);
    if (validCycles.length === 0) return { tot: 0, stand: 0, sit: 0 };

    return {
      tot: Math.min(...validCycles.map((c) => c.tot)),
      stand: Math.min(...validCycles.map((c) => c.stand)),
      sit: Math.min(...validCycles.map((c) => c.sit)),
    };
  }

  private calculateMaxCycle(
    cycles: { tot: number; stand: number; sit: number }[],
  ) {
    const validCycles = cycles.filter((c) => c.tot > 0);
    if (validCycles.length === 0) return { tot: 0, stand: 0, sit: 0 };

    return {
      tot: Math.max(...validCycles.map((c) => c.tot)),
      stand: Math.max(...validCycles.map((c) => c.stand)),
      sit: Math.max(...validCycles.map((c) => c.sit)),
    };
  }

  private calculateAvgCycle(
    cycles: { tot: number; stand: number; sit: number }[],
  ) {
    const validCycles = cycles.filter((c) => c.tot > 0);
    if (validCycles.length === 0) return { tot: 0, stand: 0, sit: 0 };

    const sum = validCycles.reduce(
      (acc, curr) => ({
        tot: acc.tot + curr.tot,
        stand: acc.stand + curr.stand,
        sit: acc.sit + curr.sit,
      }),
      { tot: 0, stand: 0, sit: 0 },
    );

    const count = validCycles.length;

    return {
      tot: parseFloat((sum.tot / count).toFixed(2)),
      stand: parseFloat((sum.stand / count).toFixed(2)),
      sit: parseFloat((sum.sit / count).toFixed(2)),
    };
  }
}
