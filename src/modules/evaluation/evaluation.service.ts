import { Injectable } from '@nestjs/common';
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

@Injectable()
export class EvaluationService extends BaseService<
  Prisma.EvaluationDelegate,
  EvaluationResponse
> {
  constructor(protected readonly prisma: PrismaService) {
    super(
      prisma,
      prisma.evaluation,
      [
        'patient.user.fullName',
        'patient.user.cpf',
        'healthProfessional.user.fullName',
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

    const { password: _pPassword, ...pUserData } = patient.user;
    const { user: _pUser, ...patientData } = patient;
    const formattedPatient = { ...patientData, ...pUserData };

    const { password: _hpPassword, ...hpUserData } = healthProfessional.user;
    const { user: _hpUser, ...hpData } = healthProfessional;
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
      conditions.push({
        OR: this.searchableFields.map((field) => {
          const parts = field.split('.');

          return parts
            .slice()
            .reverse()
            .reduce(
              (obj: Record<string, any>, part: string) => ({ [part]: obj }),
              {
                contains: search,
                mode: 'insensitive',
              },
            ) as Prisma.EvaluationWhereInput;
        }),
      });
    }

    const where: Prisma.EvaluationWhereInput = { AND: conditions };

    const [evaluations, total] = await this.prisma.$transaction([
      this.prisma.evaluation.findMany({
        where,
        include: this.defaultInclude as Prisma.EvaluationInclude,
        skip,
        take,
        orderBy: { time_end: 'desc' },
      }),
      this.prisma.evaluation.count({ where }),
    ]);

    return {
      data: evaluations.map((e) =>
        this.transform(e as unknown as EvaluationWithDetails),
      ),
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
