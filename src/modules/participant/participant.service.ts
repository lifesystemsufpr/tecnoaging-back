import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { UserService } from '../users/user.service';
import { Participant, Prisma, SystemRole, User, PreRegistration } from '@prisma/client';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { BaseService } from 'src/shared/services/base.service';
import { normalizeString } from 'src/shared/functions/normalize-string';
import { cleanCpf } from 'src/shared/functions/cpf';
import {
  FindParticipantsQueryDto,
  ParticipantSortField,
} from './dto/find-participants-query.dto';

type ParticipantWithUser = Participant & { user: User };
export type ParticipantResponse = Omit<ParticipantWithUser, 'user'> &
  Omit<User, 'password'> & {
    isPreRegistration?: boolean;
  };

@Injectable()
export class ParticipantService extends BaseService<
  Prisma.ParticipantDelegate,
  ParticipantResponse
> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {
    super(prisma, prisma.participant, ['user.fullName', 'user.cpf'], {
      user: true,
    });
  }

  protected transform(participant: ParticipantWithUser): ParticipantResponse {
    const { password: _password, ...userData } = participant.user;
    const { user: _user, ...participantData } = participant;
    return {
      ...participantData,
      ...userData,
    };
  }

  async create(createParticipantDto: CreateParticipantDto) {
    return await this.prisma.$transaction(async (tx) => {
      const {
        user: userData,
        birthday,
        ...participantData
      } = createParticipantDto;
      const timeZone = 'America/Sao_Paulo';
      const dateString = new Date(birthday).toISOString().split('T')[0];
      const correctDate = fromZonedTime(dateString, timeZone);
      const password = formatInTimeZone(correctDate, timeZone, 'ddMMyyyy');
      const user = await this.userService.createUser(
        {
          ...userData,
          password: password,
          role: SystemRole.PARTICIPANT,
        },
        tx,
      );

      const participant = await tx.participant.create({
        data: {
          ...participantData,
          birthday,
          user: {
            connect: {
              id: user.id,
            },
          },
        },
      });

      // Se existir pré-cadastro para esse CPF, nós deletamos
      try {
        await tx.preRegistration.delete({
          where: { cpf: cleanCpf(userData.cpf) },
        });
      } catch (error) {
        // Ignora caso não tenha encontrado pré-cadastro para deletar
      }

      return { ...user, ...participant };
    });
  }
  async findAll(queryDto: FindParticipantsQueryDto) {
    const {
      cpf,
      fullName,
      gender,
      city,
      state,
      neighborhood,
      zipCode,
      scholarship,
      socioEconomicLevel,
      sortField,
      sortDirection = 'asc',
    } = queryDto;

    const customWhere = {
      ...(city
        ? { city: { contains: city, mode: 'insensitive' as const } }
        : {}),
      ...(state
        ? { state: { contains: state, mode: 'insensitive' as const } }
        : {}),
      ...(neighborhood
        ? {
            neighborhood: {
              contains: neighborhood,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(zipCode
        ? { zipCode: { contains: zipCode, mode: 'insensitive' as const } }
        : {}),
      ...(scholarship ? { scholarship } : {}),
      ...(socioEconomicLevel
        ? { socio_economic_level: socioEconomicLevel }
        : {}),
      user: {
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

    const orderBy = buildParticipantOrderBy(sortField, sortDirection);

    console.time('findAll-prisma-query');
    const result = await super.findAll(queryDto, customWhere, orderBy);
    console.timeEnd('findAll-prisma-query');

    const dataWithRelations = await Promise.all(
      result.data.map(async (participant, index) => {
        try {
          const safetyInfo = await this.checkDeletability(participant.id);

          return {
            ...participant,
            hasRelations: safetyInfo.hasRelations,
            relationsDetails: safetyInfo.details,
          };
        } catch (error) {
          console.error(
            `[SERVICE] Falha ao processar relações do ID ${participant.id}:`,
            error,
          );
          return participant;
        }
      }),
    );

    let preRegistrations: PreRegistration[] = [];
    if (queryDto.page === undefined || queryDto.page === 1 || cpf || fullName) {
      preRegistrations = await this.prisma.preRegistration.findMany({
        where: {
          ...(cpf
            ? { cpf: { contains: cleanCpf(cpf), mode: 'insensitive' as const } }
            : {}),
          ...(fullName
            ? {
                fullName: {
                  contains: fullName,
                  mode: 'insensitive' as const,
                },
              }
            : {}),
        },
      });

      if (preRegistrations.length > 0) {
        const cpfs = preRegistrations.map((p) => p.cpf);
        const existingUsers = await this.prisma.user.findMany({
          where: { cpf: { in: cpfs } },
          select: { cpf: true },
        });
        const existingCpfs = new Set(existingUsers.map((u) => u.cpf));
        preRegistrations = preRegistrations.filter(
          (p) => !existingCpfs.has(p.cpf),
        );
      }
    }

    const preRegFormatted: ParticipantResponse[] = preRegistrations.map((pr) => ({
      id: pr.id,
      cpf: pr.cpf,
      fullName: pr.fullName,
      birthday: pr.birthday,
      city: '',
      gender: 'OTHER' as any,
      phone: null,
      active: true,
      isPreRegistration: true,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      fullName_normalized: '',
      role: 'PARTICIPANT' as any,
      weight: 0,
      height: 0,
      zipCode: '',
      street: '',
      number: '',
      complement: null,
      state: '',
      neighborhood: '',
      socio_economic_level: 'C' as any,
      scholarship: 'NONE' as any,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      passwordResetUsedAt: null,
      deactivatedAt: null,
      deactivatedBy: null,
      deactivationReason: null,
      reactivatedAt: null,
      reactivatedBy: null,
      hasRelations: false,
    }));

    return {
      ...result,
      data: [...preRegFormatted, ...dataWithRelations],
    };
  }

  async findOne(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ParticipantResponse> {
    const prismaClient = tx || this.prisma;
    const participantWithUser = await prismaClient.participant.findFirstOrThrow(
      {
        where: {
          id,
          active: true,
          user: { active: true },
        },
        include: { user: true },
      },
    );

    return this.transform(participantWithUser);
  }

  async update(id: string, updateParticipantDto: UpdateParticipantDto) {
    try {
      await this.findOne(id);
      let hasEffectiveChanges = false;
      const timeZone = 'America/Sao_Paulo';

      return await this.prisma.$transaction(async (tx) => {
        const { user: userData, ...participantData } = updateParticipantDto;
        let newPassword: string | undefined = undefined;

        if (participantData && participantData.birthday) {
          const dateString = new Date(participantData.birthday)
            .toISOString()
            .split('T')[0];
          const correctDate = fromZonedTime(dateString, timeZone);
          newPassword = formatInTimeZone(correctDate, timeZone, 'ddMMyyyy');
        }

        if (userData && Object.keys(userData).length > 0) {
          delete userData.password;

          if (newPassword) {
            userData.password = newPassword;
          }

          if (Object.keys(userData).length > 0) {
            await this.userService.update(id, userData, tx);
            hasEffectiveChanges = true;
          }
        } else if (newPassword) {
          await this.userService.update(id, { password: newPassword }, tx);
          hasEffectiveChanges = true;
        }

        if (participantData && Object.keys(participantData).length > 0) {
          await tx.participant.update({
            where: { id },
            data: participantData,
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
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Paciente com o ID '${id}' não encontrado.`,
        );
      }
      throw error;
    }
  }

  async remove(id: string, performedById: string, reason?: string) {
    const relationInfo = await this.checkDeletability(id);

    try {
      const deactivatedParticipant = await this.prisma.$transaction(
        async (tx) => {
          const participant = await tx.participant.update({
            where: { id },
            data: { active: false },
            include: { user: true },
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

          return participant;
        },
      );

      const responseData = this.transform(deactivatedParticipant);

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
          `Participante com ID '${id}' não encontrado.`,
        );
      }
      throw error;
    }
  }

  async reactivate(id: string, performedById: string) {
    return this.prisma.$transaction(async (tx) => {
      const participant = await tx.participant.update({
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

      return participant;
    });
  }

  async checkDeletability(id: string) {
    return await this.prisma.checkDeletionSafety('Participant', id);
  }
}

function buildParticipantOrderBy(
  sortField?: string,
  direction: 'asc' | 'desc' = 'asc',
) {
  switch (sortField) {
    case ParticipantSortField.FULL_NAME:
      return { user: { fullName: direction } };
    case ParticipantSortField.CPF:
      return { user: { cpf: direction } };
    case ParticipantSortField.BIRTHDAY:
      return { birthday: direction };
    case ParticipantSortField.CITY:
      return { city: direction };
    case ParticipantSortField.STATE:
      return { state: direction };
    case ParticipantSortField.NEIGHBORHOOD:
      return { neighborhood: direction };
    case ParticipantSortField.SCHOLARSHIP:
      return { scholarship: direction };
    case ParticipantSortField.CREATED_AT:
      return { createdAt: direction };
    default:
      return undefined;
  }
}
