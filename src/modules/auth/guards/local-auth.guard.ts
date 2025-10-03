import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';
import { Payload } from '../interfaces/auth.interface';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  private readonly logger = new Logger(LocalAuthGuard.name);

  constructor(private readonly auth: AuthService) {
    super();
  }

  public async validate(username: string, password: string): Promise<Payload> {
    const user = await this.auth.validateCredentials(username, password);
    console.log('Usuário validado e anexado ao request:', user);

    if (!user) {
      this.logger.error(
        'User not found during the validation of the LocalAuthGuard',
      );
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id!,
      cpf: user.cpf!,
      fullName: user.fullName!,
      role: user.role!,
    };
  }
}
