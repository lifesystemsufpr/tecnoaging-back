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
  metricas: Record<string, any>;
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

  create(createEvaluationDto: CreateEvaluationDto) {
    const { sensorData, ...evaluation } = createEvaluationDto;
    return this.prisma.evaluation.create({
      data: {
        ...evaluation,
        sensorData: {
          createMany: {
            data: sensorData,
          },
        },
      },
    });
  }

  async processarDadosDoTeste(
    evaluationId: string,
    perfilUsuario: {
      peso: number;
      altura: number;
      idade: number;
      sexo: string;
    },
  ) {
    const dadosBrutos = await this.prisma.sensorData.findMany({
      where: {
        evaluationId: evaluationId,
        filtered: false,
      },
      orderBy: { timestamp: 'asc' },
    });

    if (!dadosBrutos.length) {
      throw new NotFoundException('Nenhum dado bruto encontrado.');
    }

    const dataInicial = dadosBrutos[0].timestamp.getTime();

    const payloadPython = {
      peso: perfilUsuario.peso,
      altura: perfilUsuario.altura,
      idade: perfilUsuario.idade,
      sexo: perfilUsuario.sexo,
      dados: dadosBrutos.map((d) => ({
        accel_x: d.accel_x,
        accel_y: d.accel_y,
        accel_z: d.accel_z,
        gyro_x: d.gyro_x,
        gyro_y: d.gyro_y,
        gyro_z: d.gyro_z,
        timestamp: d.timestamp.getTime(),
      })),
    };

    try {
      const pythonUrl =
        (process.env['PYTHON_SERVICE_URL'] as string) ||
        'http://localhost:8000';

      const { data: result } = await lastValueFrom(
        this.httpService.post<PythonResponse>(
          `${pythonUrl}/processar`,
          payloadPython,
        ),
      );

      const dadosParaSalvar = result.timeseries_filtrada.map((p) => ({
        evaluationId: evaluationId,
        filtered: true,
        timestamp: new Date(dataInicial + p.time_offset * 1000),
        accel_x: p.accel_x,
        accel_y: p.accel_y,
        accel_z: p.accel_z,
        gyro_x: p.gyro_x,
        gyro_y: p.gyro_y,
        gyro_z: p.gyro_z,
      }));

      await this.prisma.sensorData.createMany({
        data: dadosParaSalvar,
      });

      return result.metricas;
    } catch (error) {
      this.logger.error('Erro na comunicação com Python', error);
      throw new Error('Falha ao processar dados biomecânicos.');
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
}
