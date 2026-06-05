import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateHealthProfessionalDto } from './dto/create-health-professional.dto';
import { UpdateHealthProfessionalDto } from './dto/update-health-professional.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { UserService } from '../users/user.service';
import { HealthProfessional, Prisma, SystemRole, User } from '@prisma/client';
import { BaseService } from 'src/shared/services/base.service';
import { normalizeString } from 'src/shared/functions/normalize-string';
import {
  FindHealthProfessionalsQueryDto,
  HealthProfessionalSortField,
} from './dto/find-health-professionals-query.dto';

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
      const {
        user: createUser,
        speciality,
        ...createHealthProfessional
      } = createHealthProfessionalDto;

      const user = await this.userService.createUser(
        {
          ...createUser,
          role: SystemRole.HEALTH_PROFESSIONAL,
        },
        tx,
      );

      const normalizedSpeciality = normalizeString(speciality) || '';

      const healthProfessional = await tx.healthProfessional.create({
        data: {
          ...createHealthProfessional,
          speciality,
          speciality_normalized: normalizedSpeciality,
          id: user.id,
        },
      });

      return { ...user, ...healthProfessional };
    });
  }

  async findAll(queryDto: FindHealthProfessionalsQueryDto) {
    const {
      cpf,
      fullName,
      email,
      speciality,
      gender,
      sortField,
      sortDirection = 'asc',
    } = queryDto;

    const customWhere = {
      active: true,
      ...(email ? { email: { contains: email, mode: 'insensitive' as const } } : {}),
      ...(speciality
        ? {
            speciality_normalized: {
              contains: normalizeString(speciality),
              mode: 'insensitive' as const,
            },
          }
        : {}),
      user: {
        active: true,
        ...(cpf ? { cpf: { contains: cpf, mode: 'insensitive' as const } } : {}),
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

    const orderBy = buildHealthProfessionalOrderBy(sortField, sortDirection);
    const result = await super.findAll(queryDto, customWhere, orderBy);

    const dataWithRelations = await Promise.all(
      result.data.map(async (professional) => {
        const { hasRelations, details } = await this.checkDeletability(
          professional.id,
        );
        return {
          ...professional,
          hasRelations,
          details,
        };
      }),
    );

    return {
      ...result,
      data: dataWithRelations,
    };
  }

  async findOne(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<HealthProfessionalResponse> {
    const prismaClient = tx || this.prisma;
    const healthProfessionalWithUser =
      await prismaClient.healthProfessional.findUniqueOrThrow({
        where: { id, active: true },
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
          // O UserService.update já lida com a normalização do nome
          await this.userService.update(id, userData, tx);
          hasEffectiveChanges = true;
        }
        if (
          healthProfessionalData &&
          Object.keys(healthProfessionalData).length > 0
        ) {
          const dataToUpdate: Prisma.HealthProfessionalUpdateInput = {
            ...healthProfessionalData,
          };

          if (healthProfessionalData.speciality) {
            dataToUpdate.speciality_normalized =
              normalizeString(healthProfessionalData.speciality) || '';
          }

          await tx.healthProfessional.update({
            where: { id },
            data: dataToUpdate,
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

  async remove(id: string, performedById: string, reason?: string) {
    const relationInfo = await this.checkDeletability(id);

    try {
      const deactivatedProfessional = await this.prisma.$transaction(
        async (tx) => {
          const healthProfessional = await tx.healthProfessional.update({
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

          return healthProfessional;
        },
      );

      const responseData = this.transform(deactivatedProfessional);

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
          `Profissional de saúde com ID '${id}' não encontrado.`,
        );
      }
      throw error;
    }
  }

  async reactivate(id: string, performedById: string) {
    return this.prisma.$transaction(async (tx) => {
      const healthProfessional = await tx.healthProfessional.update({
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

      return healthProfessional;
    });
  }

  async checkDeletability(id: string) {
    return await this.prisma.checkDeletionSafety('healthProfessional', id);
  }
}

function buildHealthProfessionalOrderBy(
  sortField?: string,
  direction: 'asc' | 'desc' = 'asc',
) {
  switch (sortField) {
    case HealthProfessionalSortField.FULL_NAME:
      return { user: { fullName: direction } };
    case HealthProfessionalSortField.CPF:
      return { user: { cpf: direction } };
    case HealthProfessionalSortField.EMAIL:
      return { email: direction };
    case HealthProfessionalSortField.SPECIALITY:
      return { speciality: direction };
    case HealthProfessionalSortField.CREATED_AT:
      return { createdAt: direction };
    default:
      return undefined;
  }
}
