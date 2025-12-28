import { Injectable } from '@nestjs/common';
import { UserService } from '../users/user.service';
import { CreateManagerDto } from './dto/create-manager.dto';
import { UpdateManagerDto } from './dto/update-manager.dto';
import { Prisma, SystemRole, User } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { QueryDto } from 'src/shared/dto/query.dto';

type ManagerResponse = Omit<User, 'password'>;

@Injectable()
export class ManagerService {
  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  private transform(user: User): ManagerResponse {
    const { password: _password, ...data } = user;
    return data;
  }

  create(request: CreateManagerDto) {
    return this.userService.createUser({
      ...request,
      role: SystemRole.MANAGER,
    });
  }

  async findAll(queryDto: QueryDto) {
    const { search, page = 1, pageSize = 10 } = queryDto;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const searchableFields = ['fullName', 'cpf'];

    const where: Prisma.UserWhereInput = {
      role: SystemRole.MANAGER,
    };

    if (search) {
      where.OR = searchableFields.map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      }));
    }

    const [managers, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: managers.map((manager) => this.transform(manager)), // Transforma os dados para remover a senha
      meta: { total, page, pageSize, lastPage: Math.ceil(total / pageSize) },
    };
  }

  findOne(id: string) {
    return this.userService.findOne(id);
  }

  findByCpf(cpf: string) {
    return this.userService.findByCpf(cpf);
  }

  update(id: string, updateUserDto: UpdateManagerDto) {
    return this.userService.update(id, updateUserDto);
  }

  remove(id: string) {
    return this.userService.remove(id);
  }
}
