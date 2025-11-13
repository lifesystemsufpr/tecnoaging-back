import {
  Controller,
  Post,
  UseGuards,
  Body,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RequestUser } from './decorators/request-user.decorator';
import { Public } from './decorators/public.decorator';
import { Payload } from './interfaces/auth.interface';
import { LoginDto } from './dto/login.dto';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiBody } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  @ApiBody({ type: LoginDto })
  async login(
    @RequestUser() user: Payload,
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const tokens = await this.authService.signIn(
        user,
        loginDto.keepMeLoggedIn,
      );

      const cookieOptions = {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === 'production',
        path: '/',
      };

      if (loginDto.keepMeLoggedIn) {
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        cookieOptions['maxAge'] = thirtyDays;
        console.log('Configurando cookie persistente (Max-Age).');
      } else {
        console.log('Configurando cookie de sessão.');
      }

      res.cookie('refresh_token', tokens.refresh_token, cookieOptions);

      return {
        access_token: tokens.access_token,
      };
    } catch (error) {
      console.error('Error in login controller:', error);
      throw error;
    }
  }

  @Post('refresh')
  @Public()
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldRefreshToken = req.cookies['refresh_token'] as string;
    if (!oldRefreshToken) {
      throw new UnauthorizedException('Nenhum refresh token encontrado');
    }

    try {
      const { user, persistent } =
        await this.authService.validateRefreshToken(oldRefreshToken);

      const tokens = await this.authService.signIn(user, persistent);

      const cookieOptions = {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === 'production',
        path: '/',
      };

      if (persistent) {
        cookieOptions['maxAge'] = 30 * 24 * 60 * 60 * 1000;
      }

      res.cookie('refresh_token', tokens.refresh_token, cookieOptions);

      return {
        access_token: tokens.access_token,
      };
    } catch {
      res.clearCookie('refresh_token');
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }
}
