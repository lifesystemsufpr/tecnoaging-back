import {
  Controller,
  Post,
  UseGuards,
  Body,
  Res,
  Req,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RequestUser } from './decorators/request-user.decorator';
import { Public } from './decorators/public.decorator';
import { Payload } from './interfaces/auth.interface';
import { LoginDto } from './dto/login.dto';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Realizar login do usuário' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: 'Access token JWT',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas',
  })
  async login(
    @RequestUser() user: Payload,
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('Usuário validado e anexado ao request:', user);
    try {
      const tokens = await this.authService.signIn(
        user,
        loginDto.keepMeLoggedIn,
      );

      const cookieOptions: {
        httpOnly: boolean;
        secure: boolean;
        path: string;
        sameSite: 'strict' | 'lax' | 'none';
        maxAge?: number;
      } = {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === 'production',
        path: '/',
        sameSite: 'lax',
      };

      if (loginDto.keepMeLoggedIn) {
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        cookieOptions.maxAge = thirtyDays;
        console.log('Configurando cookie persistente (Max-Age).');
      } else {
        // Cookie de sessão - não define maxAge
        console.log('Configurando cookie de sessão.');
      }

      res.cookie('refresh_token', tokens.refresh_token, cookieOptions);

      return {
        access_token: tokens.access_token,
      };
    } catch (error) {
      this.logger.error('Error in login controller:', error);
      // Se já for uma exceção HTTP, re-lança; caso contrário, lança UnauthorizedException
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Erro ao realizar login');
    }
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Renovar access token usando refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Token renovado com sucesso',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: 'Novo access token JWT',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido ou não encontrado',
  })
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

      const cookieOptions: {
        httpOnly: boolean;
        secure: boolean;
        path: string;
        sameSite: 'strict' | 'lax' | 'none';
        maxAge?: number;
      } = {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === 'production',
        path: '/',
        sameSite: 'lax',
      };

      if (persistent) {
        cookieOptions.maxAge = 30 * 24 * 60 * 60 * 1000;
      }

      res.cookie('refresh_token', tokens.refresh_token, cookieOptions);

      return {
        access_token: tokens.access_token,
      };
    } catch {
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === 'production',
        path: '/',
        sameSite: 'lax',
      });
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Logout realizado com sucesso',
  })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return {
      message: 'Logout realizado com sucesso',
    };
  }
}
