import { Injectable, NotFoundException } from '@nestjs/common';
import { PreRegistration } from '@prisma/client';
import { fromZonedTime } from 'date-fns-tz';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { CreatePreRegistrationDto } from './dto/create-pre-registration.dto';

@Injectable()
export class PreRegistrationService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(dto: CreatePreRegistrationDto): Promise<PreRegistration> {
    const { cpf, fullName, birthday } = dto;

    const dateString = new Date(birthday).toISOString().split('T')[0];
    const normalizedBirthday = fromZonedTime(dateString, 'America/Sao_Paulo');

    return await this.prisma.preRegistration.upsert({
      where: { cpf },
      create: { cpf, fullName, birthday: normalizedBirthday },
      update: { fullName, birthday: normalizedBirthday },
    });
  }

  async findByCpf(cpf: string): Promise<PreRegistration> {
    const preRegistration = await this.prisma.preRegistration.findUnique({
      where: { cpf },
    });

    if (!preRegistration) {
      throw new NotFoundException(
        `Nenhum pré-cadastro encontrado para o CPF informado.`,
      );
    }

    return preRegistration;
  }
}
