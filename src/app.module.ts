import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './shared/config/app.config';
import {
  loggingMiddleware,
  PrismaModule,
  providePrismaClientExceptionFilter,
} from 'nestjs-prisma';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserService } from './modules/users/user.service';
import { UserModule } from './modules/users/user.module';
import { ManagerModule } from './modules/manager/manager.module';
import { ResearcherModule } from './modules/researcher/researcher.module';
import { HealthProfessionalModule } from './modules/health-professional/health-professional.module';
import { ParticipantModule } from './modules/participant/participant.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { HealthUnitModule } from './modules/health-unit/health-unit.module';
import { InstitutionModule } from './modules/institution/institution.module';
import provideGlobalAppGuards from './modules/auth/providers/global-guards.provider';
import { appPrismaServiceOptions } from './shared/config/prisma-service-options';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig],
    }),

    PrismaModule.forRoot({
      isGlobal: true,
      prismaServiceOptions: appPrismaServiceOptions,
    }),

    SharedModule,
    AuthModule,
    UserModule,
    ManagerModule,
    ResearcherModule,
    HealthProfessionalModule,
    ParticipantModule,
    EvaluationModule,
    HealthUnitModule,
    InstitutionModule,
  ],
  providers: [
    providePrismaClientExceptionFilter(),
    ...provideGlobalAppGuards(),
    UserService,
  ],
})
export class AppModule {}
