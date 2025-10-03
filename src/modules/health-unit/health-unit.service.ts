import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateHealthUnitDto } from './dto/create-health-unit.dto';
import { UpdateHealthUnitDto } from './dto/update-health-unit.dto';
import { PrismaService } from 'nestjs-prisma';
import { Prisma } from '@prisma/client';

@Injectable()
export class HealthUnitService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createHealthUnitDto: CreateHealthUnitDto) {
    const healthcareData = createHealthUnitDto;
    return await this.prisma.healthcareUnit.create({
      data: healthcareData,
    });
  }

  async findAll() {
    return await this.prisma.healthcareUnit.findMany();
  }

  async findOne(id: string) {
    const healthUnit = await this.prisma.healthcareUnit.findUnique({
      where: { id },
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

      return await this.prisma.healthcareUnit.update({
        where: { id },
        data: updateHealthUnitDto,
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
    return await this.prisma.healthcareUnit.delete({ where: { id } });
  }
}
