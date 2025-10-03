import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessToken, JwtPayload, Payload } from './interfaces/auth.interface';
import { User } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { comparePassword } from 'src/shared/functions/hash-password';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateCredentials(
    cpf: string,
    password: string,
  ): Promise<Partial<User> | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { cpf },
        select: {
          id: true,
          fullName: true,
          cpf: true,
          role: true,
          password: true,
        },
      });

      if (user && (await comparePassword(password, user.password))) {
        const { password, ...result } = user;
        return result;
      }
      return null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async signIn(user: Payload): Promise<AccessToken> {
    const payload: JwtPayload = {
      username: user.fullName,
      cpf: user.cpf,
      sub: user.id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload),
    };
  }
}
