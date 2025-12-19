import { Injectable } from '@nestjs/common';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { PrismaService } from 'nestjs-prisma';
import { normalizeString } from 'src/shared/functions/normalize-string';
import { Prisma } from '@prisma/client';
import { FindInstitutionsQueryDto } from './dto/find-institution-query.dto';

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

  async findAll(query: FindInstitutionsQueryDto) {
    const {
      page = 1,
      pageSize = 10,
      search,
      active,
      title,
      orderBy,
      sortOrder,
    } = query;

    const where: Prisma.InstitutionWhereInput = {
      AND: [
        title ? { title: { contains: title, mode: 'insensitive' } } : {},
        active !== undefined ? { active } : {},
      ],
      OR: search
        ? [
            { title: { contains: search, mode: 'insensitive' } },
            { title_normalized: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [data, total] = await Promise.all([
      this.prisma.institution.findMany({
        where,
        take: Number(pageSize),
        skip: (Number(page) - 1) * Number(pageSize),
        orderBy: {
          [orderBy || 'title']: sortOrder || 'asc',
        },
      }),
      this.prisma.institution.count({ where }),
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
