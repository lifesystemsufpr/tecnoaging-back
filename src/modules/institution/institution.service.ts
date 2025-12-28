import { Injectable } from '@nestjs/common';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { normalizeString } from 'src/shared/functions/normalize-string';
import { Prisma } from '@prisma/client';

@Injectable()
export class InstitutionService {
  constructor(private readonly prisma: PrismaService) {}

  create(createInstitutionDto: CreateInstitutionDto) {
    const { title, ...rest } = createInstitutionDto;
    const normalizedTitle = normalizeString(title) || '';

    return this.prisma.institution.create({
      data: {
        ...rest,
        title,
        title_normalized: normalizedTitle,
      },
    });
  }

  findAll() {
    return this.prisma.institution.findMany({ where: { active: true } });
  }

  findOne(id: string) {
    return this.prisma.institution.findUnique({ where: { id, active: true } });
  }

  update(id: string, updateInstitutionDto: UpdateInstitutionDto) {
    const dataToUpdate: Prisma.InstitutionUpdateInput = {
      ...updateInstitutionDto,
    };

    if (updateInstitutionDto.title) {
      dataToUpdate.title_normalized =
        normalizeString(updateInstitutionDto.title) || '';
    }

    return this.prisma.institution.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.institution.update({
      where: { id },
      data: { active: false },
    });
  }

  async reactivate(id: string) {
    return this.prisma.institution.update({
      where: { id },
      data: { active: true },
    });
  }
}
