import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateResponseDto } from './dto/create-response.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { FilterQuestionnaireResponseDto } from './dto/filter-questionnaire-response.dto';
import { Prisma, SystemRole } from '@prisma/client';
import { normalizeString } from 'src/shared/functions/normalize-string';
import type {
  IvcfDomainScores,
  IvcfAssessment,
  ParticipantEvolutionResponse,
  ParticipantSummaryResponse,
  ScoreHistoryResponse,
  DomainHistoryResponse,
  AssessmentDetailResponse,
  IVCF_Assessment,
  Daily_Assessment,
  ParticipantEvolutionDailyData,
} from './interfaces/ivcf-evolution.interface';
import { Payload } from '../auth/interfaces/auth.interface';

@Injectable()
export class QuestionnaireService {
  constructor(private prisma: PrismaService) {}

  private static readonly MULTI_SELECT_QUESTION_ORDERS = new Set([14, 20]);

  private static readonly FRAILTY_LABELS = {
    robust: 'Robusto',
    preFrail: 'Pré-frágil',
    frail: 'Frágil',
  } as const;

  private static readonly LEGACY_FRAILTY_LABELS: Record<string, string> = {
    'Pré-Fragil': QuestionnaireService.FRAILTY_LABELS.preFrail,
    'Pré-fragil': QuestionnaireService.FRAILTY_LABELS.preFrail,
    'Pre-Fragil': QuestionnaireService.FRAILTY_LABELS.preFrail,
    'Pre-fragil': QuestionnaireService.FRAILTY_LABELS.preFrail,
  };

  async getIvcfStructure() {
    return this.prisma.questionnaire.findUnique({
      where: { slug: 'ivcf-20' },
      include: {
        groups: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                options: { orderBy: { order: 'asc' } },
              },
            },
            subGroups: {
              include: {
                questions: {
                  include: { options: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async recomputeAllResponses() {
    const responses = await this.prisma.questionnaireResponse.findMany({
      where: { questionnaire: { slug: 'ivcf-20' } },
      select: {
        id: true,
        totalScore: true,
        classification: true,
        answers: {
          select: {
            selectedOption: { select: { score: true } },
            question: {
              select: {
                id: true,
                order: true,
                group: { select: { order: true } },
                subGroup: { select: { group: { select: { order: true } } } },
              },
            },
          },
        },
      },
    });

    const sample: Array<{
      id: string;
      before: { totalScore: number; classification: string | null };
      after: { totalScore: number; classification: string };
    }> = [];
    let updated = 0;

    for (const response of responses) {
      const { totalScore } = this.computeDomainsFromAnswers(response.answers);
      const classification = this.classifyResponseRisk(totalScore);
      const normalizedCurrentClassification = this.normalizeFrailtyClassification(
        response.classification,
      );
      const shouldNormalizeStoredLabel =
        response.classification !== null &&
        response.classification !== normalizedCurrentClassification;

      if (
        response.totalScore === totalScore &&
        normalizedCurrentClassification === classification &&
        !shouldNormalizeStoredLabel
      ) {
        continue;
      }

      await this.prisma.questionnaireResponse.update({
        where: { id: response.id },
        data: { totalScore, classification },
      });

      if (sample.length < 20) {
        sample.push({
          id: response.id,
          before: {
            totalScore: response.totalScore,
            classification: response.classification,
          },
          after: { totalScore, classification },
        });
      }
      updated += 1;
    }

    return { updated, total: responses.length, sample };
  }

  private classifyResponseRisk(totalScore: number) {
    if (totalScore >= 15) return QuestionnaireService.FRAILTY_LABELS.frail;
    if (totalScore >= 7) return QuestionnaireService.FRAILTY_LABELS.preFrail;
    return QuestionnaireService.FRAILTY_LABELS.robust;
  }

  private normalizeFrailtyClassification(classification: string | null) {
    if (!classification) {
      return classification;
    }

    return (
      QuestionnaireService.LEGACY_FRAILTY_LABELS[classification] ||
      classification
    );
  }

  async createResponse(dto: CreateResponseDto) {
    if (!dto.healthProfessionalId) {
      throw new BadRequestException('healthProfessionalId e obrigatorio.');
    }

    const [participant, healthProfessional, questionnaire] = await Promise.all([
      this.prisma.participant.findUnique({
        where: { id: dto.participantId },
        select: { id: true, active: true },
      }),
      this.prisma.healthProfessional.findUnique({
        where: { id: dto.healthProfessionalId },
        select: { id: true, active: true },
      }),
      this.prisma.questionnaire.findUnique({
        where: { id: dto.questionnaireId },
        select: { id: true },
      }),
    ]);

    if (!participant || !participant.active) {
      throw new BadRequestException('Participante invalido ou inativo.');
    }

    if (!healthProfessional || !healthProfessional.active) {
      throw new BadRequestException('Profissional de saude invalido ou inativo.');
    }

    if (!questionnaire) {
      throw new BadRequestException('Questionario invalido.');
    }

    const normalizedAnswers: Array<{
      questionId: string;
      selectedOptionId?: string;
      valueText?: string;
    }> = [];

    for (const answer of dto.answers) {
      const optionIds = this.normalizeSelectedOptionIds(answer);

      if (optionIds.length > 0) {
        for (const selectedOptionId of optionIds) {
          normalizedAnswers.push({
            questionId: answer.questionId,
            selectedOptionId,
            valueText: answer.valueText,
          });
        }
        continue;
      }

      normalizedAnswers.push({
        questionId: answer.questionId,
        valueText: answer.valueText,
      });
    }

    const optionIds = normalizedAnswers
      .map((a) => a.selectedOptionId)
      .filter((id): id is string => Boolean(id));

    const selectedOptions = await this.prisma.questionOption.findMany({
      where: { id: { in: optionIds as string[] } },
      include: {
        question: {
          select: {
            id: true,
            order: true,
            group: true,
            subGroup: {
              select: { group: true },
            },
          },
        },
      },
    });

    if (optionIds.length > 0 && selectedOptions.length === 0) {
      throw new NotFoundException('Nenhuma opcao valida encontrada.');
    }

    const scoresByQuestion: Record<
      string,
      { score: number; order: number; groupId: string }
    > = {};

    const scoresByGroup: Record<string, { score: number; order: number }> = {};

    for (const option of selectedOptions) {
      const group = option.question.group || option.question.subGroup?.group;

      if (group) {
        const questionId = option.question.id;
        if (!scoresByQuestion[questionId]) {
          scoresByQuestion[questionId] = {
            score: 0,
            order: group.order,
            groupId: group.id,
          };
        }

        if (this.shouldCapQuestionAtMaxOption(option.question.order)) {
          scoresByQuestion[questionId].score = Math.max(
            scoresByQuestion[questionId].score,
            option.score,
          );
          continue;
        }

        scoresByQuestion[questionId].score += option.score;
      }
    }

    for (const questionScore of Object.values(scoresByQuestion)) {
      if (!scoresByGroup[questionScore.groupId]) {
        scoresByGroup[questionScore.groupId] = {
          score: 0,
          order: questionScore.order,
        };
      }

      scoresByGroup[questionScore.groupId].score += questionScore.score;
    }

    let finalScore = 0;

    Object.values(scoresByGroup).forEach((groupData) => {
      let groupTotal = groupData.score;

      if (groupData.order === 3) {
        groupTotal = Math.min(groupTotal, 4);
      }

      if (groupData.order === 9) {
        groupTotal = Math.min(groupTotal, 4);
      }

      finalScore += groupTotal;
    });

    const classification = this.classifyResponseRisk(finalScore);

    await this.prisma.healthProfessionalParticipant.upsert({
      where: {
        healthProfessionalId_participantId: {
          healthProfessionalId: dto.healthProfessionalId,
          participantId: dto.participantId,
        },
      },
      update: {},
      create: {
        healthProfessionalId: dto.healthProfessionalId,
        participantId: dto.participantId,
      },
    });

    return this.prisma.questionnaireResponse.create({
      data: {
        participantId: dto.participantId,
        healthProfessionalId: dto.healthProfessionalId,
        questionnaireId: dto.questionnaireId,
        totalScore: finalScore,
        classification,
        answers: {
          create: normalizedAnswers,
        },
      },
    });
  }

  async findAll(filters: FilterQuestionnaireResponseDto, user: Payload) {
    const {
      page = 1,
      pageSize = 10,
      search,
      participantEmail,
      participantCpf,
      participantName,
      healthProfessionalEmail,
      healthProfessionalCpf,
      healthProfessionalName,
      questionnaireSlug,
      startDate,
      endDate,
    } = filters;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const conditions: Prisma.QuestionnaireResponseWhereInput[] = [];

    if (user.role === SystemRole.HEALTH_PROFESSIONAL) {
      conditions.push({ healthProfessionalId: user.id });
    }

    if (participantEmail) {
      conditions.push({
        participant: {
          user: {
            cpf: { contains: participantEmail, mode: 'insensitive' },
          },
        },
      });
    }

    if (participantCpf) {
      conditions.push({
        participant: {
          user: {
            cpf: { contains: participantCpf, mode: 'insensitive' },
          },
        },
      });
    }

    if (participantName) {
      conditions.push({
        participant: {
          user: {
            fullName: { contains: participantName, mode: 'insensitive' },
          },
        },
      });
    }

    if (healthProfessionalEmail) {
      conditions.push({
        healthProfessional: {
          email: { contains: healthProfessionalEmail, mode: 'insensitive' },
        },
      });
    }

    if (healthProfessionalCpf) {
      conditions.push({
        healthProfessional: {
          user: {
            cpf: { contains: healthProfessionalCpf, mode: 'insensitive' },
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

    if (questionnaireSlug) {
      conditions.push({
        questionnaire: {
          slug: questionnaireSlug,
        },
      });
    }

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
      const termNormalized = normalizeString(search) || '';
      conditions.push({
        OR: [
          {
            participant: {
              user: {
                OR: [
                  { fullName: { contains: search, mode: 'insensitive' } },
                  {
                    fullName_normalized: {
                      contains: termNormalized,
                      mode: 'insensitive',
                    },
                  },
                  { cpf: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          },
          {
            healthProfessional: {
              OR: [
                {
                  email: { contains: search, mode: 'insensitive' },
                },
                {
                  user: {
                    OR: [
                      { fullName: { contains: search, mode: 'insensitive' } },
                      {
                        fullName_normalized: {
                          contains: termNormalized,
                          mode: 'insensitive',
                        },
                      },
                      { cpf: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                },
              ],
            },
          },
          {
            questionnaire: {
              title: { contains: search, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    const where: Prisma.QuestionnaireResponseWhereInput = { AND: conditions };

    const [responses, total] = await Promise.all([
      this.prisma.questionnaireResponse.findMany({
        where,
        select: {
          id: true,
          totalScore: true,
          classification: true,
          date: true,
          questionnaire: {
            select: {
              title: true,
              slug: true,
            },
          },
          participant: {
            select: {
              id: true,
              user: {
                select: {
                  fullName: true,
                  cpf: true,
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
        },
        skip,
        take,
        orderBy: { date: 'desc' },
      }),
      this.prisma.questionnaireResponse.count({ where }),
    ]);

    const formattedData = responses.map((r) => ({
      id: r.id,
      date: r.date,
      totalScore: r.totalScore,
      classification: this.normalizeFrailtyClassification(r.classification),
      questionnaireTitle: r.questionnaire.title,
      questionnaireSlug: r.questionnaire.slug,
      participantId: r.participant.id,
      participantName: r.participant.user.fullName,
      participantCpf: r.participant.user.cpf,
      participantEmail: null,
      healthProfessionalId: r.healthProfessional.id,
      healthProfessionalName: r.healthProfessional.user.fullName,
      healthProfessionalCpf: r.healthProfessional.user.cpf,
      healthProfessionalEmail: r.healthProfessional.email,
      healthProfessionalSpeciality: r.healthProfessional.speciality,
    }));

    return {
      data: formattedData,
      meta: {
        total,
        page,
        pageSize,
        lastPage: Math.ceil(total / pageSize),
      },
    };
  }

  async findAllByParticipant(participantId: string) {
    return this.prisma.questionnaireResponse.findMany({
      where: { participantId },
      orderBy: { date: 'desc' },
      include: {
        healthProfessional: {
          select: {
            email: true,
            user: { select: { fullName: true, cpf: true } },
          },
        },
        questionnaire: { select: { title: true } },
        answers: {
          include: {
            question: { select: { statement: true } },
            selectedOption: { select: { label: true, score: true } },
          },
        },
      },
    });
  }

  async findOneResponse(responseId: string) {
    return this.prisma.questionnaireResponse.findUnique({
      where: { id: responseId },
      include: {
        answers: {
          include: {
            question: true,
            selectedOption: true,
          },
        },
        participant: { select: { user: { select: { fullName: true, cpf: true } } } },
      },
    });
  }

  private static readonly GROUP_TO_DOMAIN: Record<
    number,
    keyof IvcfDomainScores
  > = {
    1: 'age',
    2: 'selfPerception',
    3: 'functionalCapacity',
    4: 'functionalCapacity',
    5: 'cognition',
    6: 'mood',
    7: 'mobility',
    8: 'communication',
    9: 'comorbidities',
  };

  private static readonly GROUP_CAPS: Record<number, number> = {
    3: 4,
    9: 4,
  };

  private static readonly DOMAIN_DEFAULTS: IvcfDomainScores = {
    age: 0,
    selfPerception: 0,
    functionalCapacity: 0,
    cognition: 0,
    mood: 0,
    mobility: 0,
    communication: 0,
    comorbidities: 0,
  };

  private async getIvcfResponsesQuery(participantId: string) {
    const responseIds = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT ON (DATE(qr."date"))
        qr."id"
      FROM "questionnaire_response" AS qr
      INNER JOIN "questionnaire" AS q
        ON q."id" = qr."questionnaireId"
      WHERE qr."participantId" = ${participantId}
        AND q."slug" = 'ivcf-20'
      ORDER BY DATE(qr."date") ASC, qr."createdAt" DESC
    `;

    const ids = responseIds.map((row) => row.id);

    if (ids.length === 0) {
      return [];
    }

    return this.prisma.questionnaireResponse.findMany({
      where: { id: { in: ids } },
      orderBy: { date: 'asc' },
      include: {
        answers: {
          include: {
            selectedOption: { select: { score: true, label: true } },
            question: {
              select: {
                order: true,
                statement: true,
                group: { select: { order: true } },
                subGroup: {
                  select: {
                    group: { select: { order: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  private async getAllIvcfResponsesQuery(participantId: string) {
    return this.prisma.questionnaireResponse.findMany({
      where: {
        participantId,
        questionnaire: { slug: 'ivcf-20' },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      include: {
        answers: {
          include: {
            selectedOption: { select: { score: true, label: true } },
            question: {
              select: {
                order: true,
                statement: true,
                group: { select: { order: true } },
                subGroup: {
                  select: {
                    group: { select: { order: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  private computeAssessment(
    response: Awaited<ReturnType<typeof this.getIvcfResponsesQuery>>[number],
  ): IvcfAssessment {
    const scoresByQuestion = new Map<
      string,
      { groupOrder: number; questionOrder: number; score: number }
    >();
    const scoresByGroupOrder: Record<number, number> = {};
    const rawResponses: Record<string, string> = {};

    for (const answer of response.answers) {
      const groupOrder =
        answer.question.group?.order ?? answer.question.subGroup?.group?.order;
      const questionOrder = answer.question.order;

      if (groupOrder !== undefined && answer.selectedOption) {
        const current = scoresByQuestion.get(answer.question.statement);
        if (!current) {
          scoresByQuestion.set(answer.question.statement, {
            groupOrder,
            questionOrder,
            score: answer.selectedOption.score,
          });
        } else if (this.shouldCapQuestionAtMaxOption(questionOrder)) {
          current.score = Math.max(current.score, answer.selectedOption.score);
        } else {
          current.score += answer.selectedOption.score;
        }
      }

      if (answer.selectedOption) {
        const key = answer.question.statement;
        const value = answer.selectedOption.label;
        const current = rawResponses[key];
        if (!current) {
          rawResponses[key] = value;
        } else {
          const labels = current.split('; ');
          if (!labels.includes(value)) {
            rawResponses[key] = `${current}; ${value}`;
          }
        }
      } else if (answer.valueText) {
        rawResponses[answer.question.statement] = answer.valueText;
      }
    }

    for (const questionScore of scoresByQuestion.values()) {
      scoresByGroupOrder[questionScore.groupOrder] =
        (scoresByGroupOrder[questionScore.groupOrder] || 0) +
        questionScore.score;
    }

    for (const [orderStr, cap] of Object.entries(
      QuestionnaireService.GROUP_CAPS,
    )) {
      const order = Number(orderStr);
      if (scoresByGroupOrder[order] !== undefined) {
        scoresByGroupOrder[order] = Math.min(scoresByGroupOrder[order], cap);
      }
    }

    const domains: IvcfDomainScores = {
      ...QuestionnaireService.DOMAIN_DEFAULTS,
    };

    for (const [orderStr, score] of Object.entries(scoresByGroupOrder)) {
      const domainKey = QuestionnaireService.GROUP_TO_DOMAIN[Number(orderStr)];
      if (domainKey) {
        domains[domainKey] += score;
      }
    }

    const totalScore = Object.values(domains).reduce(
      (sum, val) => sum + val,
      0,
    );

    const riskLevel = this.classifyResponseRisk(totalScore);

    return {
      id: response.id,
      date: response.date.toISOString(),
      totalScore,
      riskLevel,
      domains,
      rawResponses,
    };
  }

  private computeDomainsFromAnswers(
    answers: Array<{
      selectedOption: { score: number } | null;
      question: {
        order?: number;
        id?: string;
        group?: { order: number } | null;
        subGroup?: { group: { order: number } } | null;
      };
    }>,
  ) {
    const scoresByQuestion = new Map<
      string,
      { groupOrder: number; questionOrder: number; score: number }
    >();
    const scoresByGroupOrder: Record<number, number> = {};

    for (const answer of answers) {
      const groupOrder =
        answer.question.group?.order ?? answer.question.subGroup?.group?.order;

      if (groupOrder !== undefined && answer.selectedOption) {
        const questionOrder = answer.question.order;
        const questionKey =
          answer.question.id || `${groupOrder}:${questionOrder || 'unknown'}`;

        const current = scoresByQuestion.get(questionKey);

        if (!current) {
          scoresByQuestion.set(questionKey, {
            groupOrder,
            questionOrder: questionOrder || -1,
            score: answer.selectedOption.score,
          });
          continue;
        }

        if (this.shouldCapQuestionAtMaxOption(questionOrder)) {
          current.score = Math.max(current.score, answer.selectedOption.score);
        } else {
          current.score += answer.selectedOption.score;
        }
      }
    }

    for (const questionScore of scoresByQuestion.values()) {
      scoresByGroupOrder[questionScore.groupOrder] =
        (scoresByGroupOrder[questionScore.groupOrder] || 0) +
        questionScore.score;
    }

    for (const [orderStr, cap] of Object.entries(
      QuestionnaireService.GROUP_CAPS,
    )) {
      const order = Number(orderStr);
      if (scoresByGroupOrder[order] !== undefined) {
        scoresByGroupOrder[order] = Math.min(scoresByGroupOrder[order], cap);
      }
    }

    const domains: IvcfDomainScores = {
      ...QuestionnaireService.DOMAIN_DEFAULTS,
    };

    for (const [orderStr, score] of Object.entries(scoresByGroupOrder)) {
      const domainKey = QuestionnaireService.GROUP_TO_DOMAIN[Number(orderStr)];
      if (domainKey) {
        domains[domainKey] += score;
      }
    }

    const totalScore = Object.values(domains).reduce(
      (sum, val) => sum + val,
      0,
    );

    return { domains, totalScore };
  }

  private normalizeSelectedOptionIds(answer: {
    selectedOptionId?: string;
    selectedOptionIds?: string[];
  }) {
    const ids = [answer.selectedOptionId, ...(answer.selectedOptionIds || [])]
      .filter((id): id is string => Boolean(id));

    return Array.from(new Set(ids));
  }

  private shouldCapQuestionAtMaxOption(questionOrder?: number) {
    if (!questionOrder) {
      return false;
    }

    return QuestionnaireService.MULTI_SELECT_QUESTION_ORDERS.has(questionOrder);
  }

  private async getParticipantWithName(participantId: string) {
    return this.prisma.participant.findUniqueOrThrow({
      where: { id: participantId },
      include: { user: { select: { fullName: true } } },
    });
  }

  async getParticipantEvolution(
    participantId: string,
  ): Promise<ParticipantEvolutionResponse> {
    const [participant, responses] = await Promise.all([
      this.getParticipantWithName(participantId),
      this.getIvcfResponsesQuery(participantId),
    ]);

    const assessments = responses.map((r) => this.computeAssessment(r));

    return {
      participantId,
      participantName: participant.user.fullName,
      assessments,
    };
  }

  async getParticipantEvolutionDaily(
    participantId: string,
  ): Promise<ParticipantEvolutionDailyData> {
    const [participant, responses] = await Promise.all([
      this.getParticipantWithName(participantId),
      this.getAllIvcfResponsesQuery(participantId),
    ]);

    const groupedAssessments = new Map<string, IVCF_Assessment[]>();

    for (const response of responses) {
      const assessment = this.computeAssessment(response);
      const classification = this.classifyResponseRisk(assessment.totalScore);
      const dateKey = response.date.toISOString().slice(0, 10);

      if (!groupedAssessments.has(dateKey)) {
        groupedAssessments.set(dateKey, []);
      }

      groupedAssessments.get(dateKey)?.push({
        id: assessment.id,
        date: assessment.date,
        createdAt: response.createdAt.toISOString(),
        totalScore: assessment.totalScore,
        riskLevel: classification,
        classification,
        domains: assessment.domains,
        rawResponses: assessment.rawResponses,
      });
    }

    const dailyAssessments: Daily_Assessment[] = Array.from(
      groupedAssessments.entries(),
    ).map(([date, assessments]) => ({
      date,
      hasMultipleAssessments: assessments.length > 1,
      assessments,
    }));

    return {
      participantId,
      participantName: participant.user.fullName,
      dailyAssessments,
    };
  }

  async getParticipantSummary(
    participantId: string,
  ): Promise<ParticipantSummaryResponse> {
    const [participant, responses] = await Promise.all([
      this.getParticipantWithName(participantId),
      this.getIvcfResponsesQuery(participantId),
    ]);

    const assessments = responses.map((r) => this.computeAssessment(r));
    const last =
      assessments.length > 0 ? assessments[assessments.length - 1] : null;

    return {
      participantId,
      participantName: participant.user.fullName,
      totalAssessments: assessments.length,
      lastAssessment: last
        ? {
            id: last.id,
            date: last.date,
            totalScore: last.totalScore,
            riskLevel: last.riskLevel,
            domains: last.domains,
          }
        : null,
    };
  }

  async getScoreHistory(participantId: string): Promise<ScoreHistoryResponse> {
    const [participant, responses] = await Promise.all([
      this.getParticipantWithName(participantId),
      this.getIvcfResponsesQuery(participantId),
    ]);

    const scores = responses.map((r) => {
      const assessment = this.computeAssessment(r);
      return {
        id: assessment.id,
        date: assessment.date,
        totalScore: assessment.totalScore,
        riskLevel: assessment.riskLevel,
      };
    });

    return {
      participantId,
      participantName: participant.user.fullName,
      scores,
    };
  }

  async getDomainHistory(participantId: string): Promise<DomainHistoryResponse> {
    const [participant, responses] = await Promise.all([
      this.getParticipantWithName(participantId),
      this.getIvcfResponsesQuery(participantId),
    ]);

    const history = responses.map((r) => {
      const assessment = this.computeAssessment(r);
      return {
        id: assessment.id,
        date: assessment.date,
        domains: assessment.domains,
      };
    });

    return {
      participantId,
      participantName: participant.user.fullName,
      history,
    };
  }

  async getAssessmentDetail(
    participantId: string,
    assessmentId: string,
  ): Promise<AssessmentDetailResponse> {
    const response = await this.prisma.questionnaireResponse.findUniqueOrThrow({
      where: {
        id: assessmentId,
        participantId,
        questionnaire: { slug: 'ivcf-20' },
      },
      include: {
        answers: {
          include: {
            selectedOption: { select: { score: true, label: true } },
            question: {
              select: {
                statement: true,
                group: { select: { order: true } },
                subGroup: {
                  select: {
                    group: { select: { order: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.computeAssessment(response);
  }
}
