import { PrismaClient } from '@prisma/client';
import { QueryDto } from '../dto/query.dto';

type PrismaDelegate = {
  findMany: (args: any) => Promise<any[]>;
  count: (args: any) => Promise<number>;
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

  async findAll(queryDto: QueryDto) {
    const { search, page = 1, pageSize = 10 } = queryDto;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: WhereInput<T> = {};

    if (search && this.searchableFields.length > 0) {
      where.OR = this.searchableFields.map((field) => {
        if (field.includes('.')) {
          const [relation, relationField] = field.split('.');
          return {
            [relation]: {
              [relationField]: {
                contains: search,
                mode: 'insensitive',
              },
            },
          };
        }
        return {
          [field]: {
            contains: search,
            mode: 'insensitive',
          },
        };
      }) as Array<Record<string, any>>;
    }

    const [data, total] = (await this.prisma.$transaction([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (this.model as any).findMany({
        where,
        skip,
        take,
        include: this.defaultInclude,
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (this.model as any).count({ where }),
    ])) as [any[], number];

    return {
      data: data.map((item) => this.transform(item)),
      meta: { total, page, pageSize, lastPage: Math.ceil(total / pageSize) },
    };
  }
}
