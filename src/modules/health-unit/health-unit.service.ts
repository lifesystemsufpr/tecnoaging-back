import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateHealthUnitDto } from './dto/create-health-unit.dto';
import { UpdateHealthUnitDto } from './dto/update-health-unit.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { normalizeString } from 'src/shared/functions/normalize-string';

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

  async findAll() {
    return await this.prisma.healthcareUnit.findMany({
      where: { active: true },
    });
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
