import { PrismaClient, Prisma } from '@prisma/client';
import { QueryDto } from '../dto/query.dto';

type PrismaDelegate = {
  findMany: (args: any) => Prisma.PrismaPromise<any[]>;
  count: (args: any) => Prisma.PrismaPromise<number>;
};

type WhereInput<T extends PrismaDelegate> = Parameters<
  T['findMany']
>[0]['where'];

type Include<T extends PrismaDelegate> = Parameters<
  T['findMany']
>[0]['include'];

function normalizeString(str: string): string {
  if (!str) return str;
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export abstract class BaseService<T extends PrismaDelegate, TransformedEntity> {
  protected readonly defaultInclude: Include<T>;

  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly model: T,
    protected readonly searchableFields: string[] = [],
    defaultInclude?: Include<T>,
  ) {
    this.defaultInclude = defaultInclude;
  }

  protected abstract transform(entity: any): TransformedEntity;

  async findAll(queryDto: QueryDto, additionalWhere: WhereInput<T> = {}) {
    const { search, page = 1, pageSize = 10 } = queryDto;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const searchWhere: WhereInput<T> = {};

    if (search && this.searchableFields.length > 0) {
      const normalizedSearch = normalizeString(search);

      searchWhere.OR = this.searchableFields.map((field) => {
        const normalizedField = `${field}_normalized`;

        if (field.includes('.')) {
          const [relation, relationField] = field.split('.');
          const normalizedRelationField = `${relationField}_normalized`;

          return {
            [relation]: {
              [normalizedRelationField]: {
                contains: normalizedSearch,
                mode: 'insensitive',
              },
            },
          };
        }

        return {
          [normalizedField]: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        };
      }) as Array<Record<string, any>>;
    }

    const where: WhereInput<T> = {
      AND: [searchWhere, additionalWhere],
    };

    const [data, total] = await this.prisma.$transaction([
      this.model.findMany({
        where,
        skip,
        take,
        include: this.defaultInclude,
      }),
      this.model.count({ where }),
    ]);

    return {
      data: data.map((item) => this.transform(item)),
      meta: { total, page, pageSize, lastPage: Math.ceil(total / pageSize) },
    };
  }
}
