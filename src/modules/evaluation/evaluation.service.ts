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
  AgeGroup,
  RiskClassification,
} from '@prisma/client';
import { BaseService } from 'src/shared/services/base.service';
import { FilterEvaluationDto } from './dto/filter-evaluation.dto';
import { CriarAvaliacaoIvcf20Dto } from './dto/criar-avaliacao-ivcf20.dto';
import { RespostaAvaliacaoIvcf20Dto } from './dto/resposta-avaliacao-ivcf20.dto';

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

  // Métodos IVCF-20

  /**
   * Calcula pontuação IVCF-20 baseado nas respostas do questionário
   */
  private calcularPontuacaoIvcf20(data: CriarAvaliacaoIvcf20Dto): number {
    let score = 0;

    // Seção 1: Idade e Auto-Percepção da Saúde (máximo 4 pontos)
    if (data.ageGroup === AgeGroup.AGE_60_74) score += 0;
    if (data.ageGroup === AgeGroup.AGE_75_84) score += 1;
    if (data.ageGroup === AgeGroup.AGE_85_PLUS) score += 3;

    if (data.selfPerceptionHealth === 'REGULAR_OR_BAD') score += 1;

    // Seção 2: Atividades de Vida Diária (máximo 10 pontos)
    if (data.avdInstrumentalShopping) score += 4;
    if (data.avdInstrumentalFinance) score += 4;
    if (data.avdInstrumentalHousework) score += 4;
    if (data.avdBasicBathing) score += 6;
    // Cap AVD score at 10
    const avdScore = Math.min(
      10,
      (data.avdInstrumentalShopping ? 4 : 0) +
      (data.avdInstrumentalFinance ? 4 : 0) +
      (data.avdInstrumentalHousework ? 4 : 0) +
      (data.avdBasicBathing ? 6 : 0),
    );
    // Remove double counting
    score -= (data.avdInstrumentalShopping ? 4 : 0) +
      (data.avdInstrumentalFinance ? 4 : 0) +
      (data.avdInstrumentalHousework ? 4 : 0) +
      (data.avdBasicBathing ? 6 : 0);
    score += avdScore;

    // Seção 3: Cognição (máximo 4 pontos)
    if (data.cognitionFamilyAlert) score += 1;
    if (data.cognitionWorsening) score += 1;
    if (data.cognitionImpediment) score += 2;

    // Seção 4: Humor (máximo 4 pontos)
    if (data.humorDespair) score += 2;
    if (data.humorLossOfInterest) score += 2;

    // Seção 5: Mobilidade (máximo 4 pontos)
    if (data.mobilityFineMotor) score += 1;
    if (data.mobilityWalkingDifficulty) score += 2;
    if (data.mobilityFalls) score += 1;

    // Seção 6: Comunicação (máximo 2 pontos)
    if (data.communicationHearing) score += 1;
    if (data.communicationSpeaking) score += 1;

    // Seção 7: Comorbidades (máximo 4 pontos)
    if (data.comorbiditiesFiveOrMore) score += 2;
    if (data.comorbiditiesFiveOrMoreMeds) score += 2;

    // Seção 8: Sinais de Alerta (máximo 10 pontos)
    if (data.alertSignsIncontinence) score += 2;
    if (data.alertSignsWeightLoss) score += 2;
    if (data.alertSignsLowBMI) score += 2;
    if (data.alertSignsLowCalfCircumference) score += 2;
    if (data.alertSignsSlowGaitSpeed) score += 2;

    return score;
  }

  /**
   * Classifica risco baseado na pontuação IVCF-20
   */
  private classificarRiscoIvcf20(score: number): RiskClassification {
    if (score >= 0 && score <= 6) return RiskClassification.LOW_RISK;
    if (score >= 7 && score <= 14) return RiskClassification.MODERATE_RISK;
    return RiskClassification.HIGH_RISK; // 15+
  }

  /**
   * Cria uma nova avaliação IVCF-20
   */
  async criarIvcf20(
    data: CriarAvaliacaoIvcf20Dto,
  ): Promise<RespostaAvaliacaoIvcf20Dto> {
    const totalScore = this.calcularPontuacaoIvcf20(data);
    const riskClassification = this.classificarRiscoIvcf20(totalScore);

    const avaliacaoIvcf20 = await this.prisma.avaliacaoIvcf20.create({
      data: {
        ...data,
        totalScore,
        riskClassification,
      },
    });

    return avaliacaoIvcf20;
  }

  /**
   * Busca uma avaliação IVCF-20 por ID
   */
  async buscarUmIvcf20(id: string): Promise<RespostaAvaliacaoIvcf20Dto> {
    const avaliacaoIvcf20 =
      await this.prisma.avaliacaoIvcf20.findUniqueOrThrow({
        where: { id },
      });

    return avaliacaoIvcf20;
  }
}
