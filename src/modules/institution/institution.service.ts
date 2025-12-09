import { Injectable } from '@nestjs/common';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { PrismaService } from 'nestjs-prisma';
import { normalizeString } from '../../shared/functions/normalize-string';
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
    return this.prisma.institution.findMany();
  }

  findOne(id: string) {
    return this.prisma.institution.findUnique({ where: { id } });
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

  // só para testar
  remove(id: string) {
    return this.prisma.institution.delete({ where: { id } });
  }
}
