import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from '../users/user.service';
import { CreateManagerDto } from './dto/create-manager.dto';
import { UpdateManagerDto } from './dto/update-manager.dto';
import { UpdateManagerProfileDto } from './dto/update-manager-profile.dto';
import { ManagerProfileDto } from './dto/manager-profile.dto';
import { Prisma, SystemRole, User } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { normalizeString } from 'src/shared/functions/normalize-string';
import {
  FindManagersQueryDto,
  ManagerSortField,
} from './dto/find-managers-query.dto';

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

  async findAll(queryDto: FindManagersQueryDto) {
    const {
      page = 1,
      pageSize = 10,
      cpf,
      fullName,
      phone,
      gender,
      active,
      sortField,
      sortDirection = 'asc',
    } = queryDto;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.UserWhereInput = {
      role: SystemRole.MANAGER,
      ...(active !== undefined ? { active } : {}),
      ...(gender ? { gender } : {}),
      ...(phone ? { phone: { contains: phone, mode: 'insensitive' } } : {}),
      AND: [
        cpf ? { cpf: { contains: cpf, mode: 'insensitive' } } : {},
        fullName
          ? {
              fullName_normalized: {
                contains: normalizeString(fullName),
                mode: 'insensitive',
              },
            }
          : {},
      ],
    };

    const orderBy = buildManagerOrderBy(sortField, sortDirection);

    const [managers, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, skip, take, orderBy }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: managers.map((manager) => this.transform(manager)),
      meta: { total, page, pageSize, lastPage: Math.ceil(total / pageSize) },
    };
  }

  findOne(id: string) {
    return this.userService.findOne(id);
  }

  update(id: string, updateUserDto: UpdateManagerDto) {
    return this.userService.update(id, updateUserDto);
  }

  remove(id: string) {
    return this.userService.remove(id);
  }

  async getProfile(userId: string): Promise<ManagerProfileDto> {
    const user = await this.userService.findOne(userId);

    if (!user) {
      throw new NotFoundException('Administrator profile not found.');
    }

    const { password: _password, ...profileData } = user;
    return profileData as ManagerProfileDto;
  }

  async updateProfile(
    userId: string,
    updateManagerProfileDto: UpdateManagerProfileDto,
  ): Promise<ManagerProfileDto> {
    const user = await this.userService.update(userId, updateManagerProfileDto);

    if (!user) {
      throw new NotFoundException('Administrator profile not found.');
    }

    const { password: _password, ...profileData } = user;
    return profileData as ManagerProfileDto;
  }
}

const MANAGER_SORTABLE_FIELDS = new Set<string>(Object.values(ManagerSortField));

function buildManagerOrderBy(
  sortField?: string,
  direction: 'asc' | 'desc' = 'asc',
) {
  if (!sortField || !MANAGER_SORTABLE_FIELDS.has(sortField)) return undefined;
  return { [sortField]: direction };
}
