import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessToken, JwtPayload, Payload } from './interfaces/auth.interface';
import { User } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import {
  comparePassword,
  hashPassword,
} from 'src/shared/functions/hash-password';
import { ConfigService } from '@nestjs/config';
import {
  SecurityConfig,
  PasswordRecoveryConfig,
} from 'src/shared/config/config.interface';
import { EmailService } from 'src/shared/services/email/email.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async validateCredentials(
    cpf: string,
    password: string,
  ): Promise<Partial<User> | null> {
    try {
      const dbUrl = process.env.DATABASE_URL || 'NÃO DEFINIDA';

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

      if (!user) {
        throw new UnauthorizedException({
          debug_error: 'USUÁRIO_NAO_ENCONTRADO',
          message: `O CPF ${cpf} não retornou nenhum registro.`,
          server_env: process.env.NODE_ENV,
          db_check: dbUrl.split('@')[1] || 'Url mal formatada ou local',
        });
      }

      if (user.active === false) {
        throw new ForbiddenException({
          debug_error: 'USUARIO_INATIVO',
          message: 'Conta desativada',
        });
      }

      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException({
          debug_error: 'SENHA_INCORRETA',
          message: 'O hash não bateu.',
          stored_hash_prefix: user.password.substring(0, 10),
          received_password_len: password.length,
        });
      }

      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new UnauthorizedException({
        debug_error: 'ERRO_TECNICO_UNCAUGHT',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
      });
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

  async initiatePasswordRecovery(email: string): Promise<{ message: string }> {
    try {
      const user = await this.findUserByEmail(email);

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      if (user.role === 'PARTICIPANT') {
        throw new ForbiddenException(
          'Participantes não podem recuperar senha através de email',
        );
      }

      const resetToken = this.generateResetToken();
      const tokenHash = await hashPassword(resetToken);

      const passwordRecoveryConfig =
        this.configService.getOrThrow<PasswordRecoveryConfig>(
          'passwordRecovery',
        );
      const expiresAt = new Date(
        Date.now() + passwordRecoveryConfig.tokenExpiryHours * 60 * 60 * 1000,
      );

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: tokenHash,
          passwordResetExpiresAt: expiresAt,
          passwordResetUsedAt: null,
        },
      });

      const recoveryLink = this.generateRecoveryLink(resetToken);

      await this.emailService.sendPasswordRecoveryEmail(
        email,
        user.fullName,
        recoveryLink,
      );

      this.logger.log(`Password recovery initiated for user ${user.id}`);

      return {
        message:
          'Email de recuperação de senha foi enviado para seu email registrado',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.logger.error('Error initiating password recovery', error);
      throw new BadRequestException('Erro ao iniciar recuperação de senha');
    }
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          passwordResetToken: { not: null },
        },
      });

      if (!user || !user.passwordResetToken) {
        throw new BadRequestException('Token de recuperação inválido');
      }

      const isTokenValid = await comparePassword(
        token,
        user.passwordResetToken,
      );

      if (!isTokenValid) {
        throw new BadRequestException('Token de recuperação inválido');
      }

      if (
        !user.passwordResetExpiresAt ||
        user.passwordResetExpiresAt < new Date()
      ) {
        throw new BadRequestException('Token de recuperação expirado');
      }

      if (user.passwordResetUsedAt) {
        throw new BadRequestException('Token de recuperação já foi utilizado');
      }

      const hashedPassword = await hashPassword(newPassword);
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
          passwordResetUsedAt: new Date(),
        },
      });

      this.logger.log(`Password reset completed for user ${user.id}`);

      return {
        message: 'Senha redefinida com sucesso',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Error resetting password', error);
      throw new BadRequestException('Erro ao redefinir senha');
    }
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    const researcher = await this.prisma.researcher.findUnique({
      where: { email },
      select: { id: true },
    });

    if (researcher) {
      return await this.prisma.user.findUnique({
        where: { id: researcher.id },
      });
    }

    const healthProfessional = await this.prisma.healthProfessional.findUnique({
      where: { email },
      select: { id: true },
    });

    if (healthProfessional) {
      return await this.prisma.user.findUnique({
        where: { id: healthProfessional.id },
      });
    }

    return null;
  }

  private generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  private generateRecoveryLink(token: string): string {
    const passwordRecoveryConfig =
      this.configService.getOrThrow<PasswordRecoveryConfig>('passwordRecovery');
    const baseUrl = passwordRecoveryConfig.frontendBaseUrl;
    return `${baseUrl}/reset-password?token=${token}`;
  }
}
