import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
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
        throw new ConflictException(
          'O e-mail ou CPF fornecido já está em uso.',
        );
      }
      throw new InternalServerErrorException(
        'Não foi possível criar o usuário.',
      );
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
