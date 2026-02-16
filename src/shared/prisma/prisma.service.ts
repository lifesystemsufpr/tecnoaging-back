import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

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
      log: [{ emit: 'event', level: 'query' }],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async checkDeletionSafety(modelName: string, id: string) {
    const client = this as unknown as Record<
      string,
      { count: (args: { where: Record<string, string> }) => Promise<number> }
    >;

    const dmmfModel = Prisma.dmmf.datamodel.models.find(
      (m) => m.name.toLowerCase() === modelName.toLowerCase(),
    );

    if (!dmmfModel) return { hasRelations: false, details: {} };

    const relationsCount: Record<string, number> = {};
    const modelKey = `${dmmfModel.name.charAt(0).toLowerCase()}${dmmfModel.name.slice(1)}Id`;

    // Filtramos campos que são objetos (relações) e não são a extensão 1:1 do User
    const listRelations = dmmfModel.fields.filter(
      (f) => f.kind === 'object' && f.type !== 'User',
    );

    for (const relation of listRelations) {
      // No Prisma Client, os delegates costumam seguir o nome do MODELO em camelCase,
      // não necessariamente o nome do campo no modelo pai.
      const delegateName = `${relation.type.charAt(0).toLowerCase()}${relation.type.slice(1)}`;
      const delegate = client[delegateName];

      if (delegate && typeof delegate.count === 'function') {
        try {
          const count = await delegate.count({
            where: { [modelKey]: id },
          });
          if (count > 0) {
            relationsCount[relation.name] = count;
          }
        } catch (err) {
          this.logger.warn(
            `Não foi possível checar relação em: ${delegateName}`,
            err,
          );
          continue;
        }
      }
    }

    const totalRelations = Object.values(relationsCount).reduce(
      (a, b) => a + b,
      0,
    );

    return {
      hasRelations: totalRelations > 0,
      details: relationsCount,
    };
  }
}
