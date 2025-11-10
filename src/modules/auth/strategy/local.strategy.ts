import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Payload } from '../interfaces/auth.interface';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'cpf',
    });
  }

  async validate(cpf: string, password: string): Promise<Payload> {
    const user = await this.authService.validateCredentials(cpf, password);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return user as Payload;
  }
}
