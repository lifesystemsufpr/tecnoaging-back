import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateHealthUnitDto } from './dto/create-health-unit.dto';
import { UpdateHealthUnitDto } from './dto/update-health-unit.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { normalizeString } from 'src/shared/functions/normalize-string';
import { FindHealthcareUnitsQueryDto } from './dto/find-health-unit-query.dto';

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
      search,
      city,
      state,
      neighborhood,
      active,
      startDate,
      endDate,
      orderBy,
      sortOrder,
    } = query;

    const where: Prisma.HealthcareUnitWhereInput = {
      AND: [
        city ? { city: { contains: city, mode: 'insensitive' } } : {},
        state ? { state: { contains: state, mode: 'insensitive' } } : {},
        neighborhood
          ? { neighborhood: { contains: neighborhood, mode: 'insensitive' } }
          : {},
        active !== undefined ? { active } : {},
        // Lógica de Data
        startDate || endDate
          ? {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            }
          : {},
      ],
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { name_normalized: { contains: search, mode: 'insensitive' } },
            { zipCode: { contains: search } },
          ]
        : undefined,
    };

    const [data, total] = await Promise.all([
      this.prisma.healthcareUnit.findMany({
        where,
        take: Number(pageSize),
        skip: (Number(page) - 1) * Number(pageSize),
        orderBy: {
          [orderBy || 'name']: sortOrder || 'asc',
        },
      }),
      this.prisma.healthcareUnit.count({ where }),
    ]);

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

  async remove(id: string) {
    await this.findOne(id);

    return await this.prisma.healthcareUnit.update({
      where: { id },
      data: { active: false },
    });
  }

  async restore(id: string) {
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
      data: { active: true },
    });
  }
}
