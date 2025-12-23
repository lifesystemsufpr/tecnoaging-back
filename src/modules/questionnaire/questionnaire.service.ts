import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateResponseDto } from './dto/create-response.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class QuestionnaireService {
  constructor(private prisma: PrismaService) {}

  async getIvcfStructure() {
    return await this.prisma.questionnaire.findUnique({
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

  async createResponse(dto: CreateResponseDto) {
    const optionIds = dto.answers
      .filter((a) => a.selectedOptionId)
      .map((a) => a.selectedOptionId);

    const selectedOptions = await this.prisma.questionOption.findMany({
      where: { id: { in: optionIds as string[] } },
      include: {
        question: {
          include: {
            group: true,
            subGroup: {
              include: { group: true },
            },
          },
        },
      },
    });

    if (selectedOptions.length === 0) {
      throw new NotFoundException('Nenhuma opção válida encontrada.');
    }

    const scoresByGroup: Record<string, { score: number; order: number }> = {};

    for (const option of selectedOptions) {
      const group = option.question.group || option.question.subGroup?.group;

      if (group) {
        if (!scoresByGroup[group.id]) {
          scoresByGroup[group.id] = { score: 0, order: group.order };
        }
        scoresByGroup[group.id].score += option.score;
      }
    }

    let finalScore = 0;

    Object.values(scoresByGroup).forEach((groupData) => {
      let groupTotal = groupData.score;

      if (groupData.order === 3) {
        groupTotal = Math.min(groupTotal, 4);
      }

      if (groupData.order === 6) {
        groupTotal = Math.min(groupTotal, 2);
      }

      if (groupData.order === 9) {
        groupTotal = Math.min(groupTotal, 4);
      }

      finalScore += groupTotal;
    });

    let classification = 'Robusto';
    if (finalScore >= 7 && finalScore <= 14) {
      classification = 'Em Risco de Fragilização';
    } else if (finalScore >= 15) {
      classification = 'Frágil';
    }

    return await this.prisma.questionnaireResponse.create({
      data: {
        participantId: dto.participantId,
        healthProfessionalId: dto.healthProfessionalId,
        questionnaireId: dto.questionnaireId,
        totalScore: finalScore,
        classification: classification,
        answers: {
          create: dto.answers.map((ans) => ({
            questionId: ans.questionId,
            selectedOptionId: ans.selectedOptionId,
            valueText: ans.valueText,
          })),
        },
      },
    });
  }

  async findAllByParticipant(participantId: string) {
    return await this.prisma.questionnaireResponse.findMany({
      where: { participantId },
      orderBy: { date: 'desc' },
      include: {
        healthProfessional: {
          select: { user: { select: { fullName: true } } },
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
    return await this.prisma.questionnaireResponse.findUnique({
      where: { id: responseId },
      include: {
        answers: {
          include: {
            question: true,
            selectedOption: true,
          },
        },
        participant: { select: { user: { select: { fullName: true } } } },
      },
    });
  }
}
