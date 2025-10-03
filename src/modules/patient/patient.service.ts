import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PrismaService } from 'nestjs-prisma';
import { UserService } from '../users/user.service';
import { Patient, Prisma, SystemRole, User } from '@prisma/client';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { BaseService } from 'src/shared/services/base.service';

type PatientWithUser = Patient & { user: User };
export type PatientResponse = Omit<PatientWithUser, 'user'> &
  Omit<User, 'password'>;

@Injectable()
export class PatientService extends BaseService<
  Prisma.PatientDelegate,
  PatientResponse
> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {
    super(prisma, prisma.patient, ['user.fullName', 'user.cpf'], {
      user: true,
    });
  }

  protected transform(patient: PatientWithUser): PatientResponse {
    const { password: _password, ...userData } = patient.user;
    const { user: _user, ...patientData } = patient;
    return {
      ...patientData,
      ...userData,
    };
  }

  async create(createPatientDto: CreatePatientDto) {
    return await this.prisma.$transaction(async (tx) => {
      const { user: userData, birthday, ...patientData } = createPatientDto;
      const timeZone = 'America/Sao_Paulo';
      const dateString = new Date(birthday).toISOString().split('T')[0];
      const correctDate = fromZonedTime(dateString, timeZone);
      const password = formatInTimeZone(correctDate, timeZone, 'ddMMyyyy');
      const user = await this.userService.createUser(
        {
          ...userData,
          password: password,
          role: SystemRole.PATIENT,
        },
        tx,
      );

      const patient = await tx.patient.create({
        data: {
          ...patientData,
          birthday,
          user: {
            connect: {
              id: user.id,
            },
          },
        },
      });

      return { ...user, ...patient };
    });
  }

  async findOne(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PatientResponse> {
    const prismaClient = tx || this.prisma;
    const patientWithUser = await prismaClient.patient.findUniqueOrThrow({
      where: { id },
      include: { user: true },
    });

    return this.transform(patientWithUser);
  }

  async update(id: string, updatePatientDto: UpdatePatientDto) {
    try {
      await this.findOne(id);
      let hasEffectiveChanges = false;

      return await this.prisma.$transaction(async (tx) => {
        const { user: userData, ...patientData } = updatePatientDto;

        if (userData && Object.keys(userData).length > 0) {
          await this.userService.update(id, userData, tx);
          hasEffectiveChanges = true;
        }

        if (patientData && Object.keys(patientData).length > 0) {
          await tx.patient.update({
            where: { id },
            data: patientData,
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
    return await this.prisma.$transaction(async (tx) => {
      const evaluations = await tx.evaluation.findMany({
        where: { patientId: id },
        select: { id: true }, // Só precisamos dos IDs
      });
      const evaluationIds = evaluations.map((e) => e.id);

      if (evaluationIds.length > 0) {
        await tx.sensorData.deleteMany({
          where: { evaluationId: { in: evaluationIds } },
        });
      }

      await tx.evaluation.deleteMany({
        where: { patientId: id },
      });

      const patient = await tx.patient.delete({ where: { id } });

      const user = await this.userService.remove(id, tx);

      return { ...patient, ...user };
    });
  }
}
