import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { UserService } from '../users/user.service';
import { Participant, Prisma, SystemRole, User } from '@prisma/client';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { BaseService } from 'src/shared/services/base.service';
import { QueryDto } from 'src/shared/dto/query.dto';

type ParticipantWithUser = Participant & { user: User };
export type ParticipantResponse = Omit<ParticipantWithUser, 'user'> &
  Omit<User, 'password'>;

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

      return { ...user, ...participant };
    });
  }

  async findAll(queryDto: QueryDto) {
    const customWhere = {
      active: true,
      user: {
        active: true,
      },
    };
    return super.findAll(queryDto, customWhere);
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

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const participant = await tx.participant.update({
        where: { id },
        data: { active: false },
      });

      await this.userService.update(id, { active: false }, tx);

      return participant;
    });
  }

  async reactivate(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const participant = await tx.participant.update({
        where: { id },
        data: { active: true },
      });

      await this.userService.update(id, { active: true }, tx);

      return participant;
    });
  }
}
