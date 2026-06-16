import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { SystemRole, Prisma, User } from '@prisma/client';
import { UpdateUserDto } from './dtos/update-user.dto';
import { hashPassword } from 'src/shared/functions/hash-password';
import { normalizeString } from 'src/shared/functions/normalize-string';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(
    request: CreateUserDto,
    tx?: Prisma.TransactionClient,
  ): Promise<Omit<User, 'password'>> {
    const prisma = tx || this.prisma;
    const { password, fullName, ...userData } = request;

    // CPFs de cadastros desativados (soft delete) não aparecem nas listagens,
    // mas continuam ocupando a constraint única — o conflito precisa dizer isso.
    const existing = await prisma.user.findUnique({
      where: { cpf: userData.cpf },
      select: { active: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.active
          ? 'Já existe um cadastro com este CPF.'
          : 'Este CPF pertence a um cadastro desativado. Reative o cadastro existente em vez de criar um novo.',
      );
    }

    const hashedPassword = await hashPassword(password);
    const normalizedFullName = normalizeString(fullName) || '';

    try {
      const user = await prisma.user.create({
        data: {
          ...userData,
          fullName,
          fullName_normalized: normalizedFullName,
          active: true,
          password: hashedPassword,
        },
      });

      const { password: _, ...result } = user;
      return result;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Já existe um cadastro com este CPF.');
      }
      throw err;
    }
  }

  findAllByRole(role: SystemRole) {
    return this.prisma.user.findMany({ where: { role } });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findByCpf(cpf: string) {
    return this.prisma.user.findUnique({
      where: { cpf },
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx || this.prisma;
    const dataToUpdate: Prisma.UserUpdateInput = { ...updateUserDto };

    if (updateUserDto.password) {
      const hashedPassword = await hashPassword(updateUserDto.password);
      dataToUpdate.password = hashedPassword;
    }

    if (updateUserDto.fullName) {
      dataToUpdate.fullName_normalized = normalizeString(
        updateUserDto.fullName,
      );
    }

    return await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: string, tx?: Prisma.TransactionClient) {
    const prisma = tx || this.prisma;

    return await prisma.user.delete({
      where: { id },
    });
  }
}
