import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserModule } from '../users/user.module';
import { LocalStrategy } from './strategy/local.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SecurityConfig } from 'src/shared/config/config.interface';
import { JwtStrategy } from './strategy/jwt.strategy';
import { AuthController } from './auth.controller';
import { EmailService } from 'src/shared/services/email/email.service';

@Module({
  providers: [AuthService, LocalStrategy, JwtStrategy, EmailService],
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => {
        const securityConfig = config.getOrThrow<SecurityConfig>('security');
        return {
          secret: securityConfig.jwtSecret,
          signOptions: { expiresIn: Number(securityConfig.jwtExpirationTime) },
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
