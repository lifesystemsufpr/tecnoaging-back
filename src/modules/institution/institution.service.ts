import { Injectable } from '@nestjs/common';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class InstitutionService {
  constructor(private readonly prisma: PrismaService) {}

  create(createInstitutionDto: CreateInstitutionDto) {
    return this.prisma.institution.create({ data: createInstitutionDto });
  }

  findAll() {
    return this.prisma.institution.findMany();
  }

  findOne(id: string) {
    return this.prisma.institution.findUnique({ where: { id } });
  }

  update(id: string, updateInstitutionDto: UpdateInstitutionDto) {
    return this.prisma.institution.update({
      where: { id },
      data: updateInstitutionDto,
    });
  }
  // só para testar
  remove(id: string) {
    return this.prisma.institution.delete({ where: { id } });
  }
}
