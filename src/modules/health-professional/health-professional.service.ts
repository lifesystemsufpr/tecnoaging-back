import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateHealthProfessionalDto } from './dto/create-health-professional.dto';
import { UpdateHealthProfessionalDto } from './dto/update-health-professional.dto';
import { PrismaService } from 'nestjs-prisma';
import { UserService } from '../users/user.service';
import { HealthProfessional, Prisma, SystemRole, User } from '@prisma/client';
import { BaseService } from 'src/shared/services/base.service';
import { QueryDto } from 'src/shared/dto/query.dto';

type HealthProfessionalWithUser = HealthProfessional & { user: User };
export type HealthProfessionalResponse = Omit<
  HealthProfessionalWithUser,
  'user'
> &
  Omit<User, 'password'>;

@Injectable()
export class HealthProfessionalService extends BaseService<
  Prisma.HealthProfessionalDelegate,
  HealthProfessionalResponse
> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {
    super(
      prisma,
      prisma.healthProfessional,
      ['user.fullName', 'user.cpf', 'speciality'],
      {
        user: true,
      },
    );
  }

  protected transform(
    healthProfessional: HealthProfessionalWithUser,
  ): HealthProfessionalResponse {
    const { password: _password, ...userData } = healthProfessional.user;
    const { user: _user, ...healthProfessionalData } = healthProfessional;
    return {
      ...healthProfessionalData,
      ...userData,
    };
  }

  async create(createHealthProfessionalDto: CreateHealthProfessionalDto) {
    return await this.prisma.$transaction(async (tx) => {
      const { user: createUser, ...createHealthProfessional } =
        createHealthProfessionalDto;

      const user = await this.userService.createUser(
        {
          ...createUser,
          role: SystemRole.HEALTH_PROFESSIONAL,
        },
        tx,
      );

      const healthProfessional = await tx.healthProfessional.create({
        data: {
          ...createHealthProfessional,
          id: user.id,
        },
      });

      return { ...user, ...healthProfessional };
    });
  }

  async findAll(queryDto: QueryDto) {
    const customWhere = {
      user: {
        active: true,
      },
    };

    return super.findAll(queryDto, customWhere);
  }

  async findOne(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<HealthProfessionalResponse> {
    const prismaClient = tx || this.prisma;
    const healthProfessionalWithUser =
      await prismaClient.healthProfessional.findUniqueOrThrow({
        where: { id },
        include: { user: true },
      });
    return this.transform(healthProfessionalWithUser);
  }

  async update(
    id: string,
    updateHealthProfessionalDto: UpdateHealthProfessionalDto,
  ) {
    try {
      await this.findOne(id);
      let hasEffectiveChanges = false;
      return await this.prisma.$transaction(async (tx) => {
        const { user: userData, ...healthProfessionalData } =
          updateHealthProfessionalDto;
        if (userData && Object.keys(userData).length > 0) {
          await this.userService.update(id, userData, tx);
          hasEffectiveChanges = true;
        }
        if (
          healthProfessionalData &&
          Object.keys(healthProfessionalData).length > 0
        ) {
          await tx.healthProfessional.update({
            where: { id },
            data: healthProfessionalData,
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
          `Profissional de saúde com o ID '${id}' não encontrado.`,
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.healthProfessional.update({
        where: { id },
        data: { active: false },
      });

      await this.userService.update(id, { active: false }, tx);

      return this.findOne(id, tx);
    });
  }
}
