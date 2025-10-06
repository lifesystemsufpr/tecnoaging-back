import { Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  private readonly logger = new Logger(LocalAuthGuard.name);

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.error('Authentication failed:', err || info);
      throw err || new Error('Authentication failed');
    }
    console.log('Usuário validado e anexado ao request:', user);
    return user;
  }
}
