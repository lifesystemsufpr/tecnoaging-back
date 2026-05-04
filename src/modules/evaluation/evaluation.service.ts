import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import {
  Evaluation,
  HealthcareUnit,
  HealthProfessional,
  Participant,
  Prisma,
  User,
  SensorData,
  EvaluationIndicators,
  EvaluationCycle,
  PrismaClient,
} from '@prisma/client';
import { BaseService } from 'src/shared/services/base.service';
import { FilterEvaluationDto } from './dto/filter-evaluation.dto';
import { normalizeString as normalize } from 'src/shared/functions/normalize-string';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { formatInTimeZone } from 'date-fns-tz';
import {
  CurrentMonthByGenderResponseDto,
  DashboardSummaryResponseDto,
  MonthlyHistoryResponseDto,
  ProfessionalMobileSummaryResponseDto,
  TeamPerformanceResponseDto,
} from './dto/dashboard/dashboard-response.dto';
import { DASHBOARD_TIMEZONE, MONTH_LABELS_PT_BR } from './constants';
import {
  buildMonthKey,
  calculateAverageCount,
  computePercentageChange,
  computeTrend,
  getCurrentMonthAndYear,
  getCurrentMonthRangeUtc,
  getLastTwelveMonths,
  getMonthStartUtc,
  getPreviousMonthRangeUtc,
} from './utils/dashboard.utils';

// --- TIPAGENS AUXILIARES ---

type EvaluationWithDetails = Evaluation & {
  participant: Participant & { user: User };
  healthProfessional: HealthProfessional & { user: User };
  healthcareUnit: HealthcareUnit;
};

type FormattedParticipant = Omit<Participant, 'user'> & Omit<User, 'password'>;
type FormattedHP = Omit<HealthProfessional, 'user'> & Omit<User, 'password'>;

export type EvaluationResponse = Omit<
  Evaluation,
  'participant' | 'healthProfessional'
> & {
  participant: FormattedParticipant;
  healthProfessional: FormattedHP;
};

interface PythonCycleDetail {
  Ciclo: number;
  'Tempo total Celular': number;
  'Tempo levantar Celular': number;
  'Tempo sentar Celular': number;
  'Frequência Celular': number;
  'Potência média ciclo (J/s)': number;
  'Vel. extensão levantar Celular': number;
  'Vel. flexão sentar Celular': number;
  'Valor Pico 1 Celular': number;
  'Valor Pico 2 Celular': number;
}

export interface ProcessedPoint {
  t: number;
  val: number;
}

interface PythonResponse {
  status: string;
  metricas_globais: {
    repeticoes: number;
    potencia_media_global: number;
    energia_total: number;
    tempo_total_acumulado: number;
    classificacao: string;
  };
  detalhes_ciclos: PythonCycleDetail[];
  timeseries_processada: ProcessedPoint[];
}

interface PythonMarchaStepDetail {
  pico: number;
  t_pico_s: number;
  vel_bruta_deg_s: number;
  vel_phoneX_deg_s: number;
  vel_phoneY_deg_s: number | null;
  vel_phoneZ_deg_s: number | null;
  vel_calibrada_deg_s: number;
}

interface PythonMarchaResponse {
  status: string;
  metricas_globais: {
    n_passos: number;
    estrategia: string;
    cadencia_ciclos_min: number;
    vel_ini_deg_s: number | null;
    vel_fim_deg_s: number | null;
    delta_vel_deg_s: number | null;
    slope_deg_s2: number | null;
    vel_media_deg_s: number;
    vel_dp_deg_s: number;
    cv_vel: number;
    vel_max_deg_s: number;
    vel_min_deg_s: number;
    tempo_medio_s: number | null;
    tempo_dp_s: number | null;
    cv_tempo: number | null;
    tempo_max_s: number | null;
    tempo_min_s: number | null;
  };
  detalhes_picos: PythonMarchaStepDetail[];
  timeseries_processada: ProcessedPoint[];
}

type EvaluationQueryResult = Omit<
  Evaluation,
  'participantId' | 'healthProfessionalId' | 'healthcareUnitId'
> & {
  healthcareUnit: { id: string; name: string };
  participant: Pick<Participant, 'id' | 'birthday' | 'weight' | 'height'> & {
    user: Pick<User, 'fullName' | 'cpf' | 'gender'>;
  };
  healthProfessional: Pick<
    HealthProfessional,
    'id' | 'speciality' | 'email'
  > & {
    user: Pick<User, 'fullName' | 'cpf'>;
  };
};

type DetailedEvaluation = Evaluation & {
  sensorData: SensorData[];
  indicators: EvaluationIndicators | null;
  cycles: EvaluationCycle[];
  participant: { birthday: Date };
};

interface SensorStat {
  min: number;
  max: number;
  sum: number;
}

interface SensorStatsMap {
  ax: SensorStat;
  ay: SensorStat;
  az: SensorStat;
  gx: SensorStat;
  gy: SensorStat;
  gz: SensorStat;
  count: number;
}

@Injectable()
export class EvaluationService extends BaseService<
  Prisma.EvaluationDelegate,
  EvaluationResponse
> {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    protected readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {
    super(
      prisma,
      prisma.evaluation,
      [
        'participant.user.fullName_normalized',
        'participant.user.cpf',
        'healthProfessional.user.fullName_normalized',
      ],
      {
        participant: { include: { user: true } },
        healthProfessional: { include: { user: true } },
        healthcareUnit: true,
      },
    );
  }

  protected transform(evaluation: EvaluationWithDetails): EvaluationResponse {
    const { participant, healthProfessional, ...restOfEvaluation } = evaluation;

    const pUserData = { ...participant.user };
    delete (pUserData as Partial<User>).password;

    const participantData = { ...participant };
    delete (participantData as Partial<EvaluationWithDetails['participant']>)
      .user;

    const formattedParticipant = { ...participantData, ...pUserData };

    const hpUserData = { ...healthProfessional.user };
    delete (hpUserData as Partial<User>).password;

    const hpData = { ...healthProfessional };
    delete (hpData as Partial<EvaluationWithDetails['healthProfessional']>)
      .user;

    const formattedHealthProfessional = { ...hpData, ...hpUserData };

    return {
      ...restOfEvaluation,
      participant: formattedParticipant,
      healthProfessional: formattedHealthProfessional,
    };
  }

  async create(createEvaluationDto: CreateEvaluationDto) {
    const { sensorData, ...evaluationData } = createEvaluationDto;

    const evaluation = await this.prisma.evaluation.create({
      data: {
        ...evaluationData,
        sensorData: {
          createMany: {
            data: sensorData,
          },
        },
      },
      include: {
        participant: {
          include: {
            user: true,
          },
        },
      },
    });

    const age = this.calculateAge(evaluation.participant.birthday, new Date());

    const userProfile = {
      weight: evaluation.participant.weight,
      height: evaluation.participant.height,
      sex: evaluation.participant.user.gender,
      age: age,
    };

    this.processEvaluationData(evaluation.id, userProfile).catch((err) => {
      this.logger.error(
        `Error processing evaluation ${evaluation.id} automatically`,
        err,
      );
    });

    return evaluation;
  }

  async processEvaluationData(
    evaluationId: string,
    userProfile: {
      weight: number;
      height: number;
      age: number;
      sex: string;
    },
  ) {
    const [rawData, evaluation] = await Promise.all([
      this.prisma.sensorData.findMany({
        where: { evaluationId, filtered: false },
        orderBy: { timestamp: 'asc' },
      }),
      this.prisma.evaluation.findUniqueOrThrow({
        where: { id: evaluationId },
        select: { type: true },
      }),
    ]);

    if (!rawData.length) {
      throw new NotFoundException('No raw sensor data found.');
    }

    const pythonUrl =
      (process.env['PYTHON_SERVICE_URL'] as string) || 'http://localhost:8001';

    try {
      if (evaluation.type === 'TMSTS') {
        await this._processMarchaData(evaluationId, rawData, pythonUrl);
      } else {
        await this._processSTSData(
          evaluationId,
          rawData,
          userProfile,
          pythonUrl,
        );
      }
    } catch (error: unknown) {
      this.logger.error(
        'Error communicating with Python service',
        error as any,
      );
      if (isAxiosError(error) && error.response) {
        this.logger.error(JSON.stringify(error.response.data));
      }
      throw new Error('Failed to process biomechanical data.');
    }
  }

  async processPendingEvaluations(): Promise<{
    processed: number;
    failed: number;
    skipped: number;
  }> {
    const pending = await this.prisma.evaluation.findMany({
      where: {
        indicators: { is: null },
        sensorData: { some: { filtered: false } },
      },
      include: {
        participant: { include: { user: true } },
      },
    });

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const evaluation of pending) {
      const age = this.calculateAge(
        evaluation.participant.birthday,
        new Date(),
      );

      const userProfile = {
        weight: evaluation.participant.weight,
        height: evaluation.participant.height,
        sex: evaluation.participant.user.gender,
        age,
      };

      try {
        await this.processEvaluationData(evaluation.id, userProfile);
        processed++;
      } catch (err) {
        if (err instanceof NotFoundException) {
          skipped++;
          continue;
        }
        failed++;
        this.logger.error(
          `Failed to reprocess pending evaluation ${evaluation.id}`,
          err,
        );
      }
    }

    this.logger.log(
      `Pending evaluations batch finished — processed=${processed} failed=${failed} skipped=${skipped} total=${pending.length}`,
    );

    return { processed, failed, skipped };
  }

  private async _processSTSData(
    evaluationId: string,
    rawData: SensorData[],
    userProfile: { weight: number; height: number; age: number; sex: string },
    pythonUrl: string,
  ) {
    const pythonPayload = {
      date: new Date().toISOString(),
      participantId: '',
      participantInfo: {
        max: userProfile.weight,
        height: userProfile.height,
        age: userProfile.age,
        sex: userProfile.sex,
      },
      sensorData: rawData.map((d) => ({
        accel_x: d.accel_x,
        accel_y: d.accel_y,
        accel_z: d.accel_z,
        gyro_x: d.gyro_x,
        gyro_y: d.gyro_y,
        gyro_z: d.gyro_z,
        timestamp: d.timestamp.toISOString(),
      })),
    };

    const { data: result } = await lastValueFrom(
      this.httpService.post<PythonResponse>(`${pythonUrl}/processar`, pythonPayload),
    );

    await this.prisma.$transaction(async (txArgument) => {
      const tx = txArgument as PrismaClient;

      const processedCurveJson =
        result.timeseries_processada as unknown as Prisma.InputJsonValue;

      await tx.evaluationIndicators.upsert({
        where: { evaluationId },
        update: {
          repetitionCount: result.metricas_globais.repeticoes,
          meanPower: result.metricas_globais.potencia_media_global,
          totalEnergy: result.metricas_globais.energia_total,
          classification: result.metricas_globais.classificacao,
          processedCurve: processedCurveJson,
        },
        create: {
          evaluationId,
          repetitionCount: result.metricas_globais.repeticoes,
          meanPower: result.metricas_globais.potencia_media_global,
          totalEnergy: result.metricas_globais.energia_total,
          classification: result.metricas_globais.classificacao,
          processedCurve: processedCurveJson,
        },
      });

      await tx.evaluationCycle.deleteMany({ where: { evaluationId } });

      if (result.detalhes_ciclos && result.detalhes_ciclos.length > 0) {
        await tx.evaluationCycle.createMany({
          data: result.detalhes_ciclos.map((c) => ({
            evaluationId,
            cycleNumber: c.Ciclo,
            totalTime: c['Tempo total Celular'],
            standUpTime: c['Tempo levantar Celular'],
            sitDownTime: c['Tempo sentar Celular'],
            frequency: c['Frequência Celular'],
            meanPower: c['Potência média ciclo (J/s)'],
            extensionVel: c['Vel. extensão levantar Celular'],
            flexionVel: c['Vel. flexão sentar Celular'],
            peak1Val: c['Valor Pico 1 Celular'],
            peak2Val: c['Valor Pico 2 Celular'],
          })),
        });
      }

      await tx.sensorData.updateMany({
        where: { evaluationId, filtered: false },
        data: { filtered: true },
      });
    });

    return result.metricas_globais;
  }

  private async _processMarchaData(
    evaluationId: string,
    rawData: SensorData[],
    pythonUrl: string,
  ) {
    const marchaSensorData = rawData.map((d) => ({
      timestamp: d.timestamp.toISOString(),
      gyro_x: d.gyro_x,
      gyro_y: d.gyro_y,
      gyro_z: d.gyro_z,
    }));

    const { data: result } = await lastValueFrom(
      this.httpService.post<PythonMarchaResponse>(
        `${pythonUrl}/processar-marcha`,
        { sensorData: marchaSensorData },
      ),
    );

    const g = result.metricas_globais;

    // Store full result in processedCurve; map main stats to indicator scalar fields
    const processedCurveJson = {
      timeseries: result.timeseries_processada,
      metricas: g,
      picos: result.detalhes_picos,
    } as unknown as Prisma.InputJsonValue;

    await this.prisma.$transaction(async (txArgument) => {
      const tx = txArgument as PrismaClient;

      await tx.evaluationIndicators.upsert({
        where: { evaluationId },
        update: {
          repetitionCount: g.n_passos,
          meanPower: g.vel_media_deg_s,
          totalEnergy: g.cadencia_ciclos_min,
          classification: g.estrategia,
          processedCurve: processedCurveJson,
        },
        create: {
          evaluationId,
          repetitionCount: g.n_passos,
          meanPower: g.vel_media_deg_s,
          totalEnergy: g.cadencia_ciclos_min,
          classification: g.estrategia,
          processedCurve: processedCurveJson,
        },
      });

      await tx.evaluationCycle.deleteMany({ where: { evaluationId } });

      if (result.detalhes_picos.length > 0) {
        await tx.evaluationCycle.createMany({
          data: result.detalhes_picos.map((p) => ({
            evaluationId,
            cycleNumber: p.pico,
            totalTime: p.t_pico_s,
            standUpTime: 0,
            sitDownTime: 0,
            frequency: 0,
            meanPower: p.vel_calibrada_deg_s,
            extensionVel: p.vel_bruta_deg_s,
            flexionVel: 0,
            peak1Val: p.vel_calibrada_deg_s,
            peak2Val: null,
          })),
        });
      }

      await tx.sensorData.updateMany({
        where: { evaluationId, filtered: false },
        data: { filtered: true },
      });
    });

    return g;
  }

  async findOne(id: string): Promise<EvaluationResponse> {
    const evaluation = await this.prisma.evaluation.findUniqueOrThrow({
      where: { id },
      include: {
        ...(this.defaultInclude as Prisma.EvaluationInclude),
        sensorData: true,
      },
    });

    return this.transform(evaluation as unknown as EvaluationWithDetails);
  }

  async findOneDetailed(id: string) {
    const evaluationRaw = await this.prisma.evaluation.findUnique({
      where: { id },
      include: {
        sensorData: {
          orderBy: { timestamp: 'asc' },
        },
        indicators: true,
        cycles: {
          orderBy: { cycleNumber: 'asc' },
        },
        participant: {
          select: { birthday: true },
        },
      },
    });

    if (!evaluationRaw) throw new NotFoundException('Evaluation not found');

    const evaluation = evaluationRaw as unknown as DetailedEvaluation;

    const initialStats: SensorStatsMap = {
      ax: { min: Infinity, max: -Infinity, sum: 0 },
      ay: { min: Infinity, max: -Infinity, sum: 0 },
      az: { min: Infinity, max: -Infinity, sum: 0 },
      gx: { min: Infinity, max: -Infinity, sum: 0 },
      gy: { min: Infinity, max: -Infinity, sum: 0 },
      gz: { min: Infinity, max: -Infinity, sum: 0 },
      count: 0,
    };

    const sensorDataFormatted: number[][] = [];

    for (const s of evaluation.sensorData) {
      sensorDataFormatted.push([
        s.timestamp.getTime(),
        s.accel_x,
        s.accel_y,
        s.accel_z,
        s.gyro_x,
        s.gyro_y,
        s.gyro_z,
      ]);

      this.updateStat(initialStats.ax, s.accel_x);
      this.updateStat(initialStats.ay, s.accel_y);
      this.updateStat(initialStats.az, s.accel_z);
      this.updateStat(initialStats.gx, s.gyro_x);
      this.updateStat(initialStats.gy, s.gyro_y);
      this.updateStat(initialStats.gz, s.gyro_z);
      initialStats.count++;
    }

    const finalStats = {
      ax: this.calculateMean(initialStats.ax, initialStats.count),
      ay: this.calculateMean(initialStats.ay, initialStats.count),
      az: this.calculateMean(initialStats.az, initialStats.count),
      gx: this.calculateMean(initialStats.gx, initialStats.count),
      gy: this.calculateMean(initialStats.gy, initialStats.count),
      gz: this.calculateMean(initialStats.gz, initialStats.count),
    };

    const sensorBlock = {
      format: 'col',
      columns: ['t', 'ax', 'ay', 'az', 'gx', 'gy', 'gz'],
      units: {
        t: 'ms',
        ax: 'g',
        ay: 'g',
        az: 'g',
        gx: 'rad/s',
        gy: 'rad/s',
        gz: 'rad/s',
      },
      samplingHz: 60,
      resolution: 1000,
      downsampled: true,
      method: 'LTTB',
      originalSampleCount: initialStats.count,
      data: sensorDataFormatted,
      stats: finalStats,
    };

    const participantAge = this.calculateAge(
      evaluation.participant.birthday,
      evaluation.date,
    );

    const processedData =
      (evaluation.indicators?.processedCurve as unknown as ProcessedPoint[]) ||
      [];

    const derivedBlock = {
      participantAgeOnEvaluation: participantAge,
      indicators: evaluation.indicators
        ? [
            {
              name: 'Repetitions',
              value: evaluation.indicators.repetitionCount,
              maxValue: 30,
              classification: evaluation.indicators.classification,
            },
            {
              name: 'Power',
              value: evaluation.indicators.meanPower,
              maxValue: 500,
              classification: '',
              unit: 'W',
            },
            {
              name: 'Total Energy',
              value: evaluation.indicators.totalEnergy,
              maxValue: 10000,
              classification: '',
              unit: 'J',
            },
          ]
        : [],
      overallClassification: evaluation.indicators?.classification || 'N/A',
    };

    const cyclesList: EvaluationCycle[] = evaluation.cycles || [];

    return {
      sensor: sensorBlock,
      processed: {
        data: processedData,
        label: 'Ângulo do Tronco',
        unit: '°',
      },
      derived: derivedBlock,
      cycles: cyclesList.map((c) => ({
        cycle: c.cycleNumber,
        totalTime: c.totalTime,
        standUpTime: c.standUpTime,
        sitDownTime: c.sitDownTime,
        power: c.meanPower,
        velocityExtension: c.extensionVel,
        velocityFlexion: c.flexionVel,
      })),
    };
  }

  private updateStat(stat: SensorStat, value: number) {
    if (value < stat.min) stat.min = value;
    if (value > stat.max) stat.max = value;
    stat.sum += value;
  }

  private calculateMean(stat: SensorStat, count: number) {
    return {
      min: stat.min === Infinity ? 0 : stat.min,
      max: stat.max === -Infinity ? 0 : stat.max,
      mean: count > 0 ? stat.sum / count : 0,
    };
  }

  async findAll(filters: FilterEvaluationDto) {
    const {
      page = 1,
      pageSize = 10,
      search,
      participantCpf,
      participantName,
      healthProfessionalCpf,
      healthProfessionalName,
      type,
      startDate,
      endDate,
    } = filters;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const conditions: Prisma.EvaluationWhereInput[] = [];

    if (participantCpf) {
      conditions.push({
        participant: {
          user: {
            cpf: {
              contains: participantCpf,
              mode: 'insensitive',
            },
          },
        },
      });
    }
    if (participantName) {
      conditions.push({
        participant: {
          user: {
            fullName: {
              contains: participantName,
              mode: 'insensitive',
            },
          },
        },
      });
    }
    if (healthProfessionalName) {
      conditions.push({
        healthProfessional: {
          user: {
            fullName: {
              contains: healthProfessionalName,
              mode: 'insensitive',
            },
          },
        },
      });
    }
    if (healthProfessionalCpf) {
      conditions.push({
        healthProfessional: {
          user: {
            cpf: {
              contains: healthProfessionalCpf,
              mode: 'insensitive',
            },
          },
        },
      });
    }
    if (type) conditions.push({ type });
    if (startDate || endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (startDate) dateFilter.gte = startDate;
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        dateFilter.lte = endOfDay;
      }
      conditions.push({ date: dateFilter });
    }

    if (search) {
      const termNormalized = normalize(search);

      conditions.push({
        OR: this.searchableFields.map((field) => {
          const parts = field.split('.');
          const isNormalizedField = field.endsWith('_normalized');

          return parts
            .slice()
            .reverse()
            .reduce(
              (obj: Record<string, any>, part: string) => ({ [part]: obj }),
              {
                contains: isNormalizedField ? termNormalized : search,
                ...(isNormalizedField ? {} : { mode: 'insensitive' }),
              },
            ) as Prisma.EvaluationWhereInput;
        }),
      });
    }

    const where: Prisma.EvaluationWhereInput = { AND: conditions };

    const selectFields = {
      id: true,
      date: true,
      type: true,
      time_init: true,
      time_end: true,
      updatedAt: true,
      indicators: true,
      healthcareUnit: {
        select: {
          id: true,
          name: true,
        },
      },
      participant: {
        select: {
          id: true,
          birthday: true,
          height: true,
          weight: true,
          user: {
            select: {
              fullName: true,
              cpf: true,
              gender: true,
            },
          },
        },
      },
      healthProfessional: {
        select: {
          id: true,
          speciality: true,
          email: true,
          user: {
            select: {
              fullName: true,
              cpf: true,
            },
          },
        },
      },
    };

    const [evaluations, total] = await Promise.all([
      this.prisma.evaluation.findMany({
        where,
        select: selectFields,
        skip,
        take,
        orderBy: { time_end: 'desc' },
      }),
      this.prisma.evaluation.count({ where }),
    ]);

    const data = (evaluations as unknown as EvaluationQueryResult[]).map(
      (e) => {
        const { user: pUser, ...pInfo } = e.participant;
        const formattedParticipant = { ...pInfo, ...pUser };

        const { user: hpUser, ...hpInfo } = e.healthProfessional;
        const formattedHP = { ...hpInfo, ...hpUser };

        return {
          ...e,
          participant: formattedParticipant,
          healthProfessional: formattedHP,
        };
      },
    );

    return {
      data: data as unknown as EvaluationResponse[],
      meta: { total, page, pageSize, lastPage: Math.ceil(total / pageSize) },
    };
  }

  async remove(id: string) {
    const relationInfo = await this.checkDeletability(id);

    try {
      const deletedEvaluation = await this.prisma.evaluation.delete({
        where: { id },
        include: {
          participant: { include: { user: true } },
          healthProfessional: { include: { user: true } },
          healthcareUnit: true,
        },
      });

      const formatted = this.transform(deletedEvaluation);

      return {
        ...formatted,
        hasRelations: relationInfo.hasRelations,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Avaliação com ID '${id}' não encontrada.`);
      }
      throw error;
    }
  }

  async checkDeletability(id: string) {
    return await this.prisma.checkDeletionSafety('evaluation', id);
  }

  private calculateAge(birthDate: Date, referenceDate: Date): number {
    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const m = referenceDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && referenceDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  async getCurrentMonthByGender(
    healthProfessionalId: string,
  ): Promise<CurrentMonthByGenderResponseDto> {
    await this.ensureHealthProfessionalExists(healthProfessionalId);

    const { startUtc, endUtc } = getCurrentMonthRangeUtc(DASHBOARD_TIMEZONE);
    const { month, year } = getCurrentMonthAndYear(DASHBOARD_TIMEZONE);

    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        healthProfessionalId,
        date: {
          gte: startUtc,
          lt: endUtc,
        },
      },
      select: {
        participant: {
          select: {
            user: {
              select: {
                gender: true,
              },
            },
          },
        },
      },
    });

    let male = 0;
    let female = 0;

    for (const evaluation of evaluations) {
      const gender = evaluation.participant.user.gender;
      if (gender === 'MALE') male++;
      if (gender === 'FEMALE') female++;
    }

    return {
      timezone: DASHBOARD_TIMEZONE,
      month,
      year,
      total: evaluations.length,
      male,
      female,
    };
  }

  async getTeamPerformance(
    healthProfessionalId: string,
  ): Promise<TeamPerformanceResponseDto> {
    await this.ensureHealthProfessionalExists(healthProfessionalId);

    const unitRows = await this.prisma.evaluation.findMany({
      where: { healthProfessionalId },
      select: { healthcareUnitId: true },
      distinct: ['healthcareUnitId'],
    });

    const unitIds = unitRows.map((row) => row.healthcareUnitId);
    if (!unitIds.length) {
      return {
        individual: null,
        teamAverage: 0,
        difference: 0,
        hasIndividualData: false,
      };
    }

    const [teamByProfessional, individualTotal] = await Promise.all([
      this.prisma.evaluation.groupBy({
        by: ['healthProfessionalId'],
        where: {
          healthcareUnitId: { in: unitIds },
        },
        _count: {
          _all: true,
        },
      }),
      this.prisma.evaluation.count({
        where: { healthProfessionalId },
      }),
    ]);

    const teamTestCounts = teamByProfessional.map((item) => item._count._all);
    const teamAverage = calculateAverageCount(teamTestCounts);

    const hasIndividualData = individualTotal > 0;
    const individual = hasIndividualData ? individualTotal : null;
    const difference = Number(((individual ?? 0) - teamAverage).toFixed(2));

    return {
      individual,
      teamAverage,
      difference,
      hasIndividualData,
    };
  }

  async getMonthlyHistory(
    healthProfessionalId: string,
  ): Promise<MonthlyHistoryResponseDto> {
    await this.ensureHealthProfessionalExists(healthProfessionalId);

    const months = getLastTwelveMonths(DASHBOARD_TIMEZONE);
    const firstMonth = months[0];
    const lastMonth = months[months.length - 1];

    const startUtc = getMonthStartUtc(
      firstMonth.year,
      firstMonth.month,
      DASHBOARD_TIMEZONE,
    );
    const endUtc = getMonthStartUtc(
      lastMonth.year,
      lastMonth.month + 1,
      DASHBOARD_TIMEZONE,
    );

    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        healthProfessionalId,
        date: {
          gte: startUtc,
          lt: endUtc,
        },
      },
      select: {
        date: true,
      },
    });

    const map = new Map<string, number>();
    for (const month of months) {
      map.set(buildMonthKey(month.year, month.month), 0);
    }

    for (const evaluation of evaluations) {
      const monthKey = formatInTimeZone(
        evaluation.date,
        DASHBOARD_TIMEZONE,
        'yyyy-MM',
      );
      if (!map.has(monthKey)) continue;
      map.set(monthKey, (map.get(monthKey) || 0) + 1);
    }

    const data = months.map(({ year, month }) => ({
      monthLabel: MONTH_LABELS_PT_BR[month - 1],
      month,
      year,
      total: map.get(buildMonthKey(year, month)) || 0,
    }));

    return {
      timezone: DASHBOARD_TIMEZONE,
      data,
    };
  }

  async getDashboardSummary(
    healthProfessionalId: string,
  ): Promise<DashboardSummaryResponseDto> {
    const [currentMonthByGender, teamPerformance, monthlyHistory] =
      await Promise.all([
        this.getCurrentMonthByGender(healthProfessionalId),
        this.getTeamPerformance(healthProfessionalId),
        this.getMonthlyHistory(healthProfessionalId),
      ]);

    return {
      currentMonthByGender,
      teamPerformance,
      monthlyHistory,
    };
  }

  async getProfessionalMobileSummary(
    healthProfessionalId: string,
  ): Promise<ProfessionalMobileSummaryResponseDto> {
    await this.ensureHealthProfessionalExists(healthProfessionalId);

    const { startUtc: curStart, endUtc: curEnd } =
      getCurrentMonthRangeUtc(DASHBOARD_TIMEZONE);
    const { startUtc: prevStart, endUtc: prevEnd } =
      getPreviousMonthRangeUtc(DASHBOARD_TIMEZONE);
    const { month, year } = getCurrentMonthAndYear(DASHBOARD_TIMEZONE);

    const [monthlyHistory, currentCount, previousCount, allEvaluations, unitRows] =
      await Promise.all([
        this.getMonthlyHistory(healthProfessionalId),
        this.prisma.evaluation.count({
          where: {
            healthProfessionalId,
            date: { gte: curStart, lt: curEnd },
          },
        }),
        this.prisma.evaluation.count({
          where: {
            healthProfessionalId,
            date: { gte: prevStart, lt: prevEnd },
          },
        }),
        this.prisma.evaluation.findMany({
          where: { healthProfessionalId },
          select: {
            participant: {
              select: { user: { select: { gender: true } } },
            },
          },
        }),
        this.prisma.evaluation.findMany({
          where: { healthProfessionalId },
          select: { healthcareUnitId: true },
          distinct: ['healthcareUnitId'],
        }),
      ]);

    const unitIds = unitRows.map((r) => r.healthcareUnitId);

    const [curTeamGroups, prevTeamGroups] = await Promise.all([
      unitIds.length
        ? this.prisma.evaluation.groupBy({
            by: ['healthProfessionalId'],
            where: {
              healthcareUnitId: { in: unitIds },
              date: { gte: curStart, lt: curEnd },
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      unitIds.length
        ? this.prisma.evaluation.groupBy({
            by: ['healthProfessionalId'],
            where: {
              healthcareUnitId: { in: unitIds },
              date: { gte: prevStart, lt: prevEnd },
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    // averages.global
    const globalCurrent = calculateAverageCount(
      curTeamGroups.map((g) => g._count._all),
    );
    const globalPrevious = calculateAverageCount(
      prevTeamGroups.map((g) => g._count._all),
    );
    const globalPctChange = computePercentageChange(globalCurrent, globalPrevious);

    // averages.individual — média dos últimos 12 meses usando monthlyHistory
    const individualMonthlyAvg = calculateAverageCount(
      monthlyHistory.data.map((d) => d.total),
    );
    const individualPctChange = computePercentageChange(
      currentCount,
      individualMonthlyAvg,
    );

    // gender distribution — todo o período
    let male = 0;
    let female = 0;
    for (const ev of allEvaluations) {
      const gender = ev.participant.user.gender;
      if (gender === 'MALE') male++;
      else if (gender === 'FEMALE') female++;
    }
    const total = allEvaluations.length;
    const malePercentage =
      total > 0 ? Number(((male / total) * 100).toFixed(1)) : 0;
    const femalePercentage =
      total > 0 ? Number(((female / total) * 100).toFixed(1)) : 0;

    const evaluationsPctChange = computePercentageChange(
      currentCount,
      previousCount,
    );

    return {
      evaluations: {
        currentMonth: currentCount,
        previousMonth: previousCount,
        percentageChange: evaluationsPctChange,
        month,
        year,
        timezone: DASHBOARD_TIMEZONE,
      },
      averages: {
        global: {
          value: globalCurrent,
          percentageChange: globalPctChange,
          trend: computeTrend(globalPctChange),
        },
        individual: {
          value: individualMonthlyAvg,
          percentageChange: individualPctChange,
          trend: computeTrend(individualPctChange),
        },
      },
      monthlyHistory,
      genderDistribution: {
        total,
        male,
        malePercentage,
        female,
        femalePercentage,
      },
    };
  }

  private async ensureHealthProfessionalExists(healthProfessionalId: string) {
    const healthProfessional = await this.prisma.healthProfessional.findUnique({
      where: { id: healthProfessionalId },
      select: { id: true },
    });

    if (!healthProfessional) {
      throw new NotFoundException('Profissional de saúde não encontrado.');
    }
  }

  async getRepetitionsHistory(participantId: string) {
    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        participantId: participantId,
        indicators: {
          isNot: null,
        },
      },
      select: {
        date: true,
        indicators: {
          select: {
            repetitionCount: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    const formattedData = evaluations.map((ev) => ({
      day: ev.date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
      repetitions: ev.indicators?.repetitionCount || 0,
    }));
    return { data: formattedData };
  }
}
