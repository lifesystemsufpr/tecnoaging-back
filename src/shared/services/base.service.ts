import { PrismaClient, Prisma } from '@prisma/client';
import { PaginationDto } from '../dto/pagination.dto';
import { normalizeString } from '../functions/normalize-string';
import { cleanCpf } from '../functions/cpf';

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

  async findAll(
    queryDto: PaginationDto & { search?: string },
    additionalWhere: WhereInput<T> = {},
    orderBy?: any,
  ) {
    const {
      search,
      page = 1,
      pageSize = 10,
    } = queryDto as PaginationDto & {
      search?: string;
    };

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const searchWhere: WhereInput<T> = {};

    const nonNormalizedFields = ['cpf', 'email'];

    if (search && this.searchableFields.length > 0) {
      const normalizedSearch = normalizeString(search) || '';
      const rawSearch = search;

      searchWhere.OR = this.searchableFields.map((field) => {
        let isNonNormalized = nonNormalizedFields.includes(field);
        let relation = '';
        let fieldName = field;

        if (field.includes('.')) {
          const parts = field.split('.');
          relation = parts[0];
          fieldName = parts[1];
          if (nonNormalizedFields.includes(fieldName)) {
            isNonNormalized = true;
          }
        }

        if (isNonNormalized) {
          // CPF é armazenado sem máscara: busca com máscara também deve funcionar
          const searchValue =
            fieldName === 'cpf' ? cleanCpf(rawSearch) || rawSearch : rawSearch;
          const whereClause = {
            [fieldName]: {
              contains: searchValue,
              mode: 'insensitive',
            },
          };
          return relation ? { [relation]: whereClause } : whereClause;
        }

        const normalizedField = `${fieldName}_normalized`;
        const whereClause = {
          [normalizedField]: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        };
        return relation ? { [relation]: whereClause } : whereClause;
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
        orderBy,
      }),
      this.model.count({ where }),
    ]);

    return {
      data: data.map((item) => this.transform(item)),
      meta: { total, page, pageSize, lastPage: Math.ceil(total / pageSize) },
    };
  }
}
