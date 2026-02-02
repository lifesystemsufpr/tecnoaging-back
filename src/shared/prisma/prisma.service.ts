import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

interface PrismaDelegate {
  findUnique: (args: {
    where: { id: string };
    include?: { _count: boolean };
  }) => Promise<{
    _count?: Record<string, number>;
    [key: string]: unknown;
  } | null>;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = `${process.env.DATABASE_URL}`;

    const pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (this as any).$on('query', () => {});
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async checkDeletionSafety(modelName: string, id: string) {
    const prismaClient = this as unknown as Record<string, unknown>;

    const delegate = prismaClient[modelName] as PrismaDelegate | undefined;

    if (!delegate) {
      throw new NotFoundException(
        `Model ${modelName} não encontrada no Prisma Client.`,
      );
    }

    const record = await delegate.findUnique({
      where: { id },
      include: {
        _count: true,
      },
    });

    if (!record) {
      throw new NotFoundException(`Registro não encontrado em ${modelName}`);
    }

    const relationsCount = record._count ?? {};

    const totalRelations = Object.values(relationsCount).reduce(
      (acc: number, val: number) => acc + (val || 0),
      0,
    );

    const hasRelations = totalRelations > 0;

    return {
      ...record,
      hasRelations,
      _relationsDetails: relationsCount,
    };
  }
}
