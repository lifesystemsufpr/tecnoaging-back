import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateResearcherDto } from './dto/create-researcher.dto';
import { UpdateResearcherDto } from './dto/update-researcher.dto';
import { PrismaService } from 'nestjs-prisma';
import { UserService } from '../users/user.service';
import {
  Institution,
  Prisma,
  Researcher,
  SystemRole,
  User,
} from '@prisma/client';
import { BaseService } from 'src/shared/services/base.service';

type ResearcherWithDetails = Researcher & {
  user: User;
  institution: Institution;
};
export type ResearcherResponse = Omit<Researcher, 'userId' | 'institutionId'> &
  Omit<User, 'password'> &
  Omit<Institution, 'id' | 'title'> & { institutionName: string };

@Injectable()
export class ResearcherService extends BaseService<
  Prisma.ResearcherDelegate,
  ResearcherResponse
> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {
    super(
      prisma,
      prisma.researcher,
      ['user.fullName', 'user.cpf', 'institution.title'],
      {
        user: true,
        institution: true,
      },
    );
  }

  protected transform(researcher: ResearcherWithDetails): ResearcherResponse {
    const { password: _password, ...userData } = researcher.user;
    const { title } = researcher.institution;
    const {
      user: _user,
      institution: _institution,
      ...researcherData
    } = researcher;

    return {
      ...userData,
      institutionName: title,
      ...researcherData,
    };
  }

  async create(createResearcherDto: CreateResearcherDto) {
    return await this.prisma.$transaction(async (tx) => {
      const { user: createUser, ...createResearcher } = createResearcherDto;

      const user = await this.userService.createUser(
        { ...createUser, role: SystemRole.RESEARCHER },
        tx,
      );

      const researcher = await tx.researcher.create({
        data: {
          id: user.id,
          ...createResearcher,
        },
      });

      return { ...user, ...researcher };
    });
  }

  async findOne(id: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx || this.prisma;
    const researcherWithDetails =
      await prismaClient.researcher.findUniqueOrThrow({
        where: { id },
        include: {
          user: true,
          institution: true,
        },
      });

    return this.transform(researcherWithDetails);
  }

  async update(id: string, updateResearcherDto: UpdateResearcherDto) {
    try {
      await this.findOne(id);
      let hasEffectiveChanges = false;

      return await this.prisma.$transaction(async (tx) => {
        const { user: userData, ...researcherData } = updateResearcherDto;

        if (userData && Object.keys(userData).length > 0) {
          await this.userService.update(id, userData, tx);
          hasEffectiveChanges = true;
        }

        if (researcherData && Object.keys(researcherData).length > 0) {
          await tx.researcher.update({
            where: { id },
            data: researcherData,
          });
          hasEffectiveChanges = true;
        }

        if (!hasEffectiveChanges) {
          throw new BadRequestException(
            'Nenhum campo válido para atualização foi fornecido.',
          );
        }

        return this.findOne(id, tx);
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Paciente com o ID '${id}' não encontrado.`,
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const researcher = await tx.researcher.delete({
        where: { id },
      });

      const user = await this.userService.remove(id, tx);

      return { ...researcher, ...user };
    });
  }
}
