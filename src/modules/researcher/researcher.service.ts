import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateResearcherDto } from './dto/create-researcher.dto';
import { UpdateResearcherDto } from './dto/update-researcher.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { UserService } from '../users/user.service';
import {
  Institution,
  Prisma,
  Researcher,
  SystemRole,
  User,
} from '@prisma/client';
import { BaseService } from 'src/shared/services/base.service';
import { normalizeString } from 'src/shared/functions/normalize-string';
import { cleanCpf } from 'src/shared/functions/cpf';
import {
  FindResearchersQueryDto,
  ResearcherSortField,
} from './dto/find-researchers-query.dto';
import { GetKPIQueryParams } from './dto/researcher-kpi.dto';
import {
  ResearcherEvaluationsData,
  ResearcherParticipantsData,
} from './interfaces/researcher.interface';
import { getAgeDistribution } from './helpers/getAgeDistribution.helper';
import { getEducationLevel } from './helpers/getEducationLevel';
import { getAge } from './helpers/getAge';
import { getEvaluationsByHealthcareUnit } from './helpers/getEvaluationsByHealthcareUnit';
import { getParticipantsPerUbs } from './helpers/getParticipantsPerUbs';
import { getTemporalEvolution } from './helpers/getTemporalEvolution';
import { getEvaluationsByTestType } from './helpers/getEvaluationsByType';

type ResearcherWithDetails = Researcher & {
  user: User;
  institution: Institution;
};

export type ResearcherResponse = Omit<Researcher, 'userId' | 'institutionId'> &
  Omit<User, 'password'> &
  Omit<Institution, 'id' | 'title'> & { institutionName: string };

@Injectable()
export class ResearcherService extends BaseService<
  Prisma.ResearcherDelegate,
  ResearcherResponse
> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {
    super(
      prisma,
      prisma.researcher,
      ['user.fullName', 'user.cpf', 'institution.title'],
      {
        user: true,
        institution: true,
      },
    );
  }

  protected transform(researcher: ResearcherWithDetails): ResearcherResponse {
    const { password: _password, ...userData } = researcher.user;
    const { title, title_normalized } = researcher.institution;
    const {
      user: _user,
      institution: _institution,
      ...researcherData
    } = researcher;

    return {
      ...userData,
      ...researcherData,
      institutionName: title,
      title_normalized: title_normalized,
    };
  }

  async create(createResearcherDto: CreateResearcherDto) {
    return await this.prisma.$transaction(async (tx) => {
      const { user: createUser, ...createResearcher } = createResearcherDto;

      const user = await this.userService.createUser(
        { ...createUser, role: SystemRole.RESEARCHER },
        tx,
      );

      const researcher = await tx.researcher.create({
        data: {
          id: user.id,
          ...createResearcher,
        },
      });

      return { ...user, ...researcher };
    });
  }

  async findAll(queryDto: FindResearchersQueryDto) {
    const {
      cpf,
      fullName,
      email,
      fieldOfStudy,
      gender,
      institutionId,
      sortField,
      sortDirection = 'asc',
    } = queryDto;

    const customWhere = {
      active: true,
      ...(institutionId ? { institutionId } : {}),
      ...(email
        ? { email: { contains: email, mode: 'insensitive' as const } }
        : {}),
      ...(fieldOfStudy
        ? {
            fieldOfStudy: {
              contains: fieldOfStudy,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      user: {
        active: true,
        ...(cpf
          ? { cpf: { contains: cleanCpf(cpf), mode: 'insensitive' as const } }
          : {}),
        ...(fullName
          ? {
              fullName_normalized: {
                contains: normalizeString(fullName),
                mode: 'insensitive' as const,
              },
            }
          : {}),
        ...(gender ? { gender } : {}),
      },
    };

    const orderBy = buildResearcherOrderBy(sortField, sortDirection);
    const result = await super.findAll(queryDto, customWhere, orderBy);

    const itemsWithSafetyFlag = await Promise.all(
      result.data.map(async (researcher) => {
        const { hasRelations, details } = await this.checkDeletability(
          researcher.id,
        );
        return {
          ...researcher,
          hasRelations,
          details,
        };
      }),
    );

    return {
      ...result,
      data: itemsWithSafetyFlag,
    };
  }

  async findOne(id: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx || this.prisma;
    const researcherWithDetails =
      await prismaClient.researcher.findFirstOrThrow({
        where: {
          id,
          active: true,
          user: { active: true },
        },
        include: {
          user: true,
          institution: true,
        },
      });

    return this.transform(researcherWithDetails);
  }

  async update(id: string, updateResearcherDto: UpdateResearcherDto) {
    try {
      await this.findOne(id);
      let hasEffectiveChanges = false;

      return await this.prisma.$transaction(async (tx) => {
        const { user: userData, ...researcherData } = updateResearcherDto;

        if (userData && Object.keys(userData).length > 0) {
          await this.userService.update(id, userData, tx);
          hasEffectiveChanges = true;
        }

        if (researcherData && Object.keys(researcherData).length > 0) {
          await tx.researcher.update({
            where: { id },
            data: researcherData,
          });
          hasEffectiveChanges = true;
        }

        if (!hasEffectiveChanges) {
          throw new BadRequestException(
            'Nenhum campo válido para atualização foi fornecido.',
          );
        }

        return this.findOne(id, tx);
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Pesquisador com o ID '${id}' não encontrado.`,
        );
      }
      throw error;
    }
  }

  async remove(id: string, performedById: string, reason?: string) {
    const relationInfo = await this.checkDeletability(id);

    try {
      const deactivatedResearcher = await this.prisma.$transaction(
        async (tx) => {
          const researcher = await tx.researcher.update({
            where: { id },
            data: { active: false },
            include: { user: true, institution: true },
          });

          await tx.user.update({
            where: { id },
            data: {
              active: false,
              deactivatedAt: new Date(),
              deactivatedBy: performedById,
              deactivationReason: reason ?? null,
              reactivatedAt: null,
              reactivatedBy: null,
            },
          });

          return researcher;
        },
      );

      const responseData = this.transform(deactivatedResearcher);

      return {
        ...responseData,
        hasRelations: relationInfo.hasRelations,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Pesquisador com ID '${id}' não encontrado.`,
        );
      }
      throw error;
    }
  }

  async reactivate(id: string, performedById: string) {
    return this.prisma.$transaction(async (tx) => {
      const researcher = await tx.researcher.update({
        where: { id },
        data: { active: true },
      });

      await tx.user.update({
        where: { id },
        data: {
          active: true,
          reactivatedAt: new Date(),
          reactivatedBy: performedById,
        },
      });

      return researcher;
    });
  }

  async checkDeletability(id: string) {
    return await this.prisma.checkDeletionSafety('researcher', id);
  }

  async getResearcherPopulationData(
    researcherId: string,
    params: GetKPIQueryParams,
  ) {
    const researcher = await this.prisma.researcher.findUnique({
      where: {
        id: researcherId,
      },
    });

    if (!researcher) {
      throw new NotFoundException(
        "Pesquisador não foi encontrado durante a busca de KPI's",
      );
    }

    const participants = await this.getParticipants(researcherId);

    const participantIds = new Set(
      participants.map((participant) => participant.id),
    );

    const evaluations = await this.getEvaluations(
      researcherId,
      Array.from(participantIds),
      params.startDate,
      params.endDate,
    );

    const kpis = this.getParticipantsKPI(participants, evaluations);
    const charts = this.getParticipantCharts(
      participants,
      evaluations,
      kpis.activeParticipants.absolute,
    );

    return {
      kpis,
      charts,
    };
  }

  async getResearcherEvaluationsData(
    researcherId: string,
    params: GetKPIQueryParams,
  ) {
    const researcher = await this.prisma.researcher.findUnique({
      where: { id: researcherId },
    });

    if (!researcher) {
      throw new NotFoundException(
        'Pesquisador não foi encontrado durante a busca das informações de avaliações!',
      );
    }

    const participants = await this.getParticipants(researcherId);
    const participantIds = new Set(
      participants.map((participant) => participant.id),
    );

    const evaluations = await this.getEvaluations(
      researcherId,
      Array.from(participantIds),
      params.startDate,
      params.endDate,
    );

    const kpis = this.getEvaluationsKPI(evaluations, participants.length);
    const charts = this.getEvaluationCharts(evaluations);

    return {
      kpis,
      charts,
    };
  }

  private getParticipantCharts(
    participants: ResearcherParticipantsData[],
    evaluations: ResearcherEvaluationsData[],
    activeParticipants: number,
  ) {
    const ageDistribution = getAgeDistribution(participants);
    const educationLevel = getEducationLevel(participants);
    const participantPerUbs = getParticipantsPerUbs(
      evaluations,
      activeParticipants,
    );

    return { ageDistribution, educationLevel, participantPerUbs };
  }

  private getEvaluationCharts(evaluations: ResearcherEvaluationsData[]) {
    const evaluationsByInstitution =
      getEvaluationsByHealthcareUnit(evaluations);
    const temporalEvaluation = getTemporalEvolution(evaluations);
    const evaluationsByTypeTest = getEvaluationsByTestType(evaluations);

    return {
      evaluationsByInstitution,
      temporalEvaluation,
      evaluationsByTypeTest,
    };
  }

  private getParticipantsKPI(
    participants: ResearcherParticipantsData[],
    evaluations: ResearcherEvaluationsData[],
  ) {
    const totalParticipants = participants.length;

    const ages = participants.map((participant) => {
      return getAge(participant.birthday);
    });

    const averageAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;

    const variance =
      ages.reduce((sum, age) => {
        return sum + Math.pow(age - averageAge, 2);
      }, 0) / ages.length;

    const standardDeviation = Math.sqrt(variance);

    const activeAbsolute = participants.filter((participant) => {
      return (
        evaluations.filter((e) => e.participantId === participant.id).length > 0
      );
    }).length;

    const activePercentage =
      totalParticipants > 0 ? (activeAbsolute / totalParticipants) * 100 : 0;

    const maleAbsolute = participants.filter(
      (participant) => participant.user.gender === 'MALE',
    ).length;

    const femaleAbsolute = participants.filter(
      (participant) => participant.user.gender === 'FEMALE',
    ).length;

    const malePercentage =
      totalParticipants > 0 ? (maleAbsolute / totalParticipants) * 100 : 0;

    const femalePercentage =
      totalParticipants > 0 ? (femaleAbsolute / totalParticipants) * 100 : 0;

    return {
      totalParticipants,

      age: {
        average: Number(averageAge.toFixed(2)),
        standardDeviation: Number(standardDeviation.toFixed(2)),
      },

      activeParticipants: {
        absolute: activeAbsolute,
        percentage: Number(activePercentage.toFixed(2)),
      },

      genderDistribution: {
        male: {
          absolute: maleAbsolute,
          percentage: Number(malePercentage.toFixed(2)),
        },
        female: {
          absolute: femaleAbsolute,
          percentage: Number(femalePercentage.toFixed(2)),
        },
      },
    };
  }

  private getEvaluationsKPI(
    evaluations: ResearcherEvaluationsData[],
    totalParticipants: number,
  ) {
    const totalEvaluations = evaluations.length;

    // Participantes únicos que possuem ao menos 1 avaliação
    const participantEvaluationCount = new Map<string, number>();

    for (const evaluation of evaluations) {
      participantEvaluationCount.set(
        evaluation.participantId,
        (participantEvaluationCount.get(evaluation.participantId) ?? 0) + 1,
      );
    }

    const evaluatedParticipantsAbsolute = participantEvaluationCount.size;

    const evaluatedParticipantsPercentage =
      totalParticipants > 0
        ? Number(
            ((evaluatedParticipantsAbsolute / totalParticipants) * 100).toFixed(
              2,
            ),
          )
        : 0;

    // Quantidade de avaliações por participante
    const evaluationsPerParticipant = [...participantEvaluationCount.values()];

    const average =
      evaluationsPerParticipant.length > 0
        ? evaluationsPerParticipant.reduce((acc, value) => acc + value, 0) /
          evaluationsPerParticipant.length
        : 0;

    const variance =
      evaluationsPerParticipant.length > 0
        ? evaluationsPerParticipant.reduce((acc, value) => {
            return acc + Math.pow(value - average, 2);
          }, 0) / evaluationsPerParticipant.length
        : 0;

    const standardDeviation = Math.sqrt(variance);

    return {
      totalEvaluations: {
        absolute: totalEvaluations,
        percentageSystem: 100,
      },
      evaluatedParticipants: {
        absolute: evaluatedParticipantsAbsolute,
        percentageTotal: evaluatedParticipantsPercentage,
      },
      evaluationsPerParticipant: {
        average: Number(average.toFixed(2)),
        standardDeviation: Number(standardDeviation.toFixed(2)),
      },
    };
  }

  private async getParticipants(researcherId: string) {
    const sixtyYearsAgo = new Date();
    sixtyYearsAgo.setFullYear(sixtyYearsAgo.getFullYear() - 59);

    return this.prisma.participant.findMany({
      select: {
        id: true,
        socio_economic_level: true,
        scholarship: true,
        birthday: true,
        active: true,
        user: {
          select: {
            gender: true,
          },
        },
      },
      where: {
        birthday: {
          lte: sixtyYearsAgo,
        },
      },
    }) as Promise<ResearcherParticipantsData[]>;
  }

  private async getEvaluations(
    researcherId: string,
    participantsIds: string[],
    startDate?: string,
    endDate?: string,
  ) {
    const where: Prisma.EvaluationWhereInput = {};
    where.participantId = {
      in: participantsIds,
    };

    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      } as unknown as Prisma.DateTimeFilter;
    }
    return this.prisma.evaluation.findMany({
      where,
      select: {
        id: true,
        participantId: true,
        date: true,
        type: true,
        healthcareUnit: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }) as Promise<ResearcherEvaluationsData[]>;
  }
}

function buildResearcherOrderBy(
  sortField?: string,
  direction: 'asc' | 'desc' = 'asc',
) {
  switch (sortField) {
    case ResearcherSortField.FULL_NAME:
      return { user: { fullName: direction } };
    case ResearcherSortField.CPF:
      return { user: { cpf: direction } };
    case ResearcherSortField.EMAIL:
      return { email: direction };
    case ResearcherSortField.FIELD_OF_STUDY:
      return { fieldOfStudy: direction };
    case ResearcherSortField.INSTITUTION_NAME:
      return { institution: { title: direction } };
    case ResearcherSortField.CREATED_AT:
      return { createdAt: direction };
    default:
      return undefined;
  }
}
