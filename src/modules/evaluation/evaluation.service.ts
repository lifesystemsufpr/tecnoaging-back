import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { PrismaService } from 'nestjs-prisma';
import {
  Evaluation,
  HealthcareUnit,
  HealthProfessional,
  Patient,
  Prisma,
  User,
} from '@prisma/client';
import { BaseService } from 'src/shared/services/base.service';
import { FilterEvaluationDto } from './dto/filter-evaluation.dto';
import { normalizeString as normalize } from 'src/shared/functions/normalize-string';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

type EvaluationWithDetails = Evaluation & {
  patient: Patient & { user: User };
  healthProfessional: HealthProfessional & { user: User };
  healthcareUnit: HealthcareUnit;
};

type FormattedPatient = Omit<Patient, 'user'> & Omit<User, 'password'>;
type FormattedHP = Omit<HealthProfessional, 'user'> & Omit<User, 'password'>;

export type EvaluationResponse = Omit<
  Evaluation,
  'patient' | 'healthProfessional'
> & {
  patient: FormattedPatient;
  healthProfessional: FormattedHP;
};

// Interface matching the Python Service response (keys kept in PT-BR as per Python script)
interface PythonResponse {
  timeseries_filtrada: {
    time_offset: number;
    accel_x: number;
    accel_y: number;
    accel_z: number;
    gyro_x: number;
    gyro_y: number;
    gyro_z: number;
  }[];
  metricas: {
    num_repeticoes: number;
    potencia_media: number;
    energia_total: number;
    classificacao: string;
  };
}

type EvaluationQueryResult = Omit<
  Evaluation,
  'patientId' | 'healthProfessionalId' | 'healthcareUnitId'
> & {
  healthcareUnit: { id: string; name: string };
  patient: Pick<Patient, 'id' | 'birthday' | 'weight' | 'height'> & {
    user: Pick<User, 'fullName' | 'cpf' | 'gender'>;
  };
  healthProfessional: Pick<
    HealthProfessional,
    'id' | 'speciality' | 'email'
  > & {
    user: Pick<User, 'fullName' | 'cpf'>;
  };
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
        'patient.user.fullName_normalized',
        'patient.user.cpf',
        'healthProfessional.user.fullName_normalized',
      ],
      {
        patient: { include: { user: true } },
        healthProfessional: { include: { user: true } },
        healthcareUnit: true,
      },
    );
  }

  protected transform(evaluation: EvaluationWithDetails): EvaluationResponse {
    const { patient, healthProfessional, ...restOfEvaluation } = evaluation;

    const pUserData = { ...patient.user };
    delete (pUserData as Partial<User>).password;

    const patientData = { ...patient };
    delete (patientData as Partial<EvaluationWithDetails['patient']>).user;

    const formattedPatient = { ...patientData, ...pUserData };

    const hpUserData = { ...healthProfessional.user };
    delete (hpUserData as Partial<User>).password;

    const hpData = { ...healthProfessional };
    delete (hpData as Partial<EvaluationWithDetails['healthProfessional']>)
      .user;

    const formattedHealthProfessional = { ...hpData, ...hpUserData };

    return {
      ...restOfEvaluation,
      patient: formattedPatient,
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
        patient: {
          include: {
            user: true,
          },
        },
      },
    });

    const age = this.calculateAge(evaluation.patient.birthday, new Date());

    const userProfile = {
      weight: evaluation.patient.weight,
      height: evaluation.patient.height,
      sex: evaluation.patient.user.gender,
      age: age,
    };

    // Fire and Forget processing
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
    const rawData = await this.prisma.sensorData.findMany({
      where: {
        evaluationId: evaluationId,
        filtered: false,
      },
      orderBy: { timestamp: 'asc' },
    });

    if (!rawData.length) {
      throw new NotFoundException('No raw sensor data found.');
    }

    const initialTimestamp = rawData[0].timestamp.getTime();

    // Constructing payload for Python (Keys must remain in PT-BR/Snake Case as expected by the script)
    const pythonPayload = {
      peso: userProfile.weight,
      altura: userProfile.height,
      idade: userProfile.age,
      sexo: userProfile.sex,
      dados: rawData.map((d, i) => ({
        accel_x: d.accel_x,
        accel_y: d.accel_y,
        accel_z: d.accel_z,
        gyro_x: d.gyro_x,
        gyro_y: d.gyro_y,
        gyro_z: d.gyro_z,
        timestamp: i + 1, // Sending frame index instead of raw timestamp
      })),
    };

    try {
      const pythonUrl =
        (process.env['PYTHON_SERVICE_URL'] as string) ||
        'http://localhost:8001';

      const { data: result } = await lastValueFrom(
        this.httpService.post<PythonResponse>(
          `${pythonUrl}/processar`,
          pythonPayload,
        ),
      );

      const dataToSave = result.timeseries_filtrada.map((p) => ({
        evaluationId: evaluationId,
        filtered: true,
        timestamp: new Date(initialTimestamp + p.time_offset * 1000),
        accel_x: p.accel_x,
        accel_y: p.accel_y,
        accel_z: p.accel_z,
        gyro_x: p.gyro_x,
        gyro_y: p.gyro_y,
        gyro_z: p.gyro_z,
      }));

      await this.prisma.$transaction([
        this.prisma.sensorData.createMany({
          data: dataToSave,
        }),
        this.prisma.evaluationIndicators.create({
          data: {
            evaluationId: evaluationId,
            // Mapping Python response (PT) to Database (EN)
            repetitionCount: result.metricas.num_repeticoes,
            meanPower: result.metricas.potencia_media,
            totalEnergy: result.metricas.energia_total,
            classification: result.metricas.classificacao,
          },
        }),
      ]);

      return result.metricas;
    } catch (error) {
      this.logger.error('Error communicating with Python service', error);
      throw new Error('Failed to process biomechanical data.');
    }
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
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id },
      include: {
        sensorData: {
          where: { filtered: true },
          orderBy: { timestamp: 'asc' },
        },
        indicators: true,
        patient: {
          select: { birthday: true },
        },
      },
    });

    if (!evaluation) throw new NotFoundException('Evaluation not found');

    // 1. Format SENSOR block (Columns + Stats)
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

    // 2. Format DERIVED block (Indicators from DB)
    const patientAge = this.calculateAge(
      evaluation.patient.birthday,
      evaluation.date,
    );

    const derivedBlock = {
      patientAgeOnEvaluation: patientAge,
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
            },
            {
              name: 'Total Energy',
              value: evaluation.indicators.totalEnergy,
              maxValue: 10000,
              classification: '',
            },
          ]
        : [],
      overallClassification: evaluation.indicators?.classification || 'N/A',
    };

    const cycleBlock = {
      min: { total: 0, stand: 0, sit: 0 },
      max: { total: 0, stand: 0, sit: 0 },
    };

    return {
      sensor: sensorBlock,
      derived: derivedBlock,
      cycle: cycleBlock,
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
      patientCpf,
      patientName,
      healthProfessionalCpf,
      healthProfessionalName,
      type,
      startDate,
      endDate,
    } = filters;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const conditions: Prisma.EvaluationWhereInput[] = [];

    if (patientCpf) {
      conditions.push({
        patient: {
          user: {
            cpf: {
              contains: patientCpf,
              mode: 'insensitive',
            },
          },
        },
      });
    }
    if (patientName) {
      conditions.push({
        patient: {
          user: {
            fullName: {
              contains: patientName,
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
      patient: {
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
        const { user: pUser, ...pInfo } = e.patient;
        const formattedPatient = { ...pInfo, ...pUser };

        const { user: hpUser, ...hpInfo } = e.healthProfessional;
        const formattedHP = { ...hpInfo, ...hpUser };

        return {
          ...e,
          patient: formattedPatient,
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
    return this.prisma.$transaction(async (tx) => {
      await tx.sensorData.deleteMany({
        where: {
          evaluationId: id,
        },
      });

      const deletedEvaluation = await tx.evaluation.delete({
        where: { id },
      });

      return deletedEvaluation;
    });
  }

  private calculateAge(birthDate: Date, referenceDate: Date): number {
    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const m = referenceDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && referenceDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}
