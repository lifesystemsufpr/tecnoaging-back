import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessToken, JwtPayload, Payload } from './interfaces/auth.interface';
import { User } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { comparePassword } from 'src/shared/functions/hash-password';
import { ConfigService } from '@nestjs/config';
import { SecurityConfig } from 'src/shared/config/config.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
          active: true,
        },
      });

      if (user && user.active === false) {
        throw new ForbiddenException(
          'Sua conta está desativada. Entre em contato com o suporte para reativá-la.',
        );
      }

      if (user && (await comparePassword(password, user.password))) {
        const { password, ...result } = user;
        return result;
      }

      return null;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error('Erro ao validar credenciais', error);
      return null;
    }
  }

  async signIn(
    user: Payload,
    keepMeLoggedIn: boolean = false,
  ): Promise<AccessToken> {
    const securityConfig =
      this.configService.getOrThrow<SecurityConfig>('security');

    const payload: Record<string, any> = {
      username: user.fullName,
      cpf: user.cpf,
      sub: user.id,
      role: user.role,
    };

    const refreshPayload: Record<string, any> = {
      sub: user.id,
      persistent: keepMeLoggedIn,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: securityConfig.jwtSecret,
        expiresIn: securityConfig.jwtExpirationTime,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: securityConfig.jwtSecret,
        expiresIn: securityConfig.jwtRefreshExpirationTime,
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async validateRefreshToken(
    token: string,
  ): Promise<{ user: Payload; persistent: boolean }> {
    const securityConfig =
      this.configService.getOrThrow<SecurityConfig>('security');

    const refreshSecret = securityConfig.jwtSecret;

    try {
      type RefreshPayload = Pick<JwtPayload, 'sub'> & { persistent?: boolean };

      const payload = await this.jwtService.verifyAsync<RefreshPayload>(token, {
        secret: refreshSecret,
      });

      const user = await this.getUserFromId(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Usuário do token não encontrado');
      }

      return {
        user: user,
        persistent: payload.persistent ?? false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn('Token de refresh inválido', message);
      throw new UnauthorizedException('Token de refresh inválido ou expirado');
    }
  }

  async getUserFromId(id: string): Promise<Payload | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        cpf: true,
        role: true,
      },
    });

    if (!user) {
      return null;
    }
    return user;
  }
}
