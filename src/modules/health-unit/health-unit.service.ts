import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateHealthUnitDto } from './dto/create-health-unit.dto';
import { UpdateHealthUnitDto } from './dto/update-health-unit.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { normalizeString } from 'src/shared/functions/normalize-string';
import {
  FindHealthcareUnitsQueryDto,
  HealthcareUnitSortField,
} from './dto/find-health-unit-query.dto';

@Injectable()
export class HealthUnitService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createHealthUnitDto: CreateHealthUnitDto) {
    const { name, ...restOfData } = createHealthUnitDto;
    const normalizedName = normalizeString(name) || '';

    return await this.prisma.healthcareUnit.create({
      data: {
        ...restOfData,
        name,
        name_normalized: normalizedName,
      },
    });
  }

  async findAll(query: FindHealthcareUnitsQueryDto) {
    const {
      page = 1,
      pageSize = 10,
      name,
      city,
      state,
      neighborhood,
      zipCode,
      active,
      startDate,
      endDate,
      sortField,
      sortDirection = 'asc',
    } = query;

    const where: Prisma.HealthcareUnitWhereInput = {
      AND: [
        name
          ? {
              name_normalized: {
                contains: normalizeString(name),
                mode: 'insensitive',
              },
            }
          : {},
        city ? { city: { contains: city, mode: 'insensitive' } } : {},
        state ? { state: { contains: state, mode: 'insensitive' } } : {},
        neighborhood
          ? { neighborhood: { contains: neighborhood, mode: 'insensitive' } }
          : {},
        zipCode ? { zipCode: { contains: zipCode, mode: 'insensitive' } } : {},
        active !== undefined ? { active } : { active: true },
        startDate || endDate
          ? { createdAt: { gte: startDate, lte: endDate } }
          : {},
      ],
    };

    const orderBy = buildHealthUnitOrderBy(sortField, sortDirection);

    const [units, total] = await Promise.all([
      this.prisma.healthcareUnit.findMany({
        where,
        take: Number(pageSize),
        skip: (Number(page) - 1) * Number(pageSize),
        orderBy,
      }),
      this.prisma.healthcareUnit.count({ where }),
    ]);

    const data = await Promise.all(
      units.map(async (unit) => {
        const { hasRelations, details } = await this.checkDeletability(unit.id);
        return { ...unit, hasRelations, details };
      }),
    );

    return {
      data,
      meta: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    };
  }

  async findOne(id: string) {
    const healthUnit = await this.prisma.healthcareUnit.findFirst({
      where: { id, active: true },
    });

    if (!healthUnit) {
      throw new NotFoundException(
        `Unidade de Saúde com o ID '${id}' não encontrada.`,
      );
    }
    return healthUnit;
  }

  async update(id: string, updateHealthUnitDto: UpdateHealthUnitDto) {
    try {
      await this.findOne(id);

      const dataToUpdate: Prisma.HealthcareUnitUpdateInput = {
        ...updateHealthUnitDto,
      };

      if (updateHealthUnitDto.name) {
        dataToUpdate.name_normalized = normalizeString(
          updateHealthUnitDto.name,
        );
      }

      return await this.prisma.healthcareUnit.update({
        where: { id },
        data: dataToUpdate,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Unidade de Saúde com o ID '${id}' não encontrada.`,
        );
      }
      throw error;
    }
  }

  async remove(id: string, performedById: string, reason?: string) {
    const relationInfo = await this.checkDeletability(id);

    try {
      const deactivatedUnit = await this.prisma.healthcareUnit.update({
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

      return {
        ...deactivatedUnit,
        hasRelations: relationInfo.hasRelations,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Unidade de Saúde com o ID '${id}' não encontrada.`,
        );
      }
      throw error;
    }
  }

  async restore(id: string, performedById: string) {
    const healthUnit = await this.prisma.healthcareUnit.findFirst({
      where: { id, active: false },
    });

    if (!healthUnit) {
      throw new NotFoundException(
        `Unidade de Saúde inativa com o ID '${id}' não encontrada.`,
      );
    }

    return await this.prisma.healthcareUnit.update({
      where: { id },
      data: {
        active: true,
        reactivatedAt: new Date(),
        reactivatedBy: performedById,
      },
    });
  }

  async checkDeletability(id: string) {
    return await this.prisma.checkDeletionSafety('healthcareUnit', id);
  }
}

const HEALTH_UNIT_SORTABLE_FIELDS = new Set<string>(
  Object.values(HealthcareUnitSortField),
);

function buildHealthUnitOrderBy(
  sortField?: string,
  direction: 'asc' | 'desc' = 'asc',
) {
  if (!sortField || !HEALTH_UNIT_SORTABLE_FIELDS.has(sortField)) return undefined;
  return { [sortField]: direction };
}
