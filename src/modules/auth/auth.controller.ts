import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RequestUser } from './decorators/request-user.decorator';
import { Public } from './decorators/public.decorator';
import { ApiBody } from '@nestjs/swagger';
import { LoginRequest } from './interfaces/auth.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  @ApiBody({ type: LoginRequest })
  async login(@RequestUser() user) {
    console.log('Usuário validado e anexado ao request:', user);
    try {
      const result = await this.authService.signIn(user);
      console.log('Login successful, token generated');
      return result;
    } catch (error) {
      console.error('Error in login controller:', error);
      throw error;
    }
  }

  // @Post('change-password')
  // async changePassword() {
  //   return 'This action changes user password';
  // }
}
