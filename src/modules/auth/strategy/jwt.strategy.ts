import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecurityConfig } from 'src/shared/config/config.interface';
import { JwtPayload, Payload } from '../interfaces/auth.interface';
import { UserService } from 'src/modules/users/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.getOrThrow<SecurityConfig>('security').jwtSecret,
    });
  }

  // Passport builda um objeto user com base no retorno desse método, e anexa ao objeto Request (req.user)
  async validate(payload: JwtPayload): Promise<Payload> {
    const user = await this.userService.findByCpf(payload.cpf);

    if (!user) {
      this.logger.error(
        'User not found during the validation of the JwtPayload',
      );
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      cpf: user.cpf,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
