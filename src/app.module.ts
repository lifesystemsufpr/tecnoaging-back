import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './shared/config/app.config';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserService } from './modules/users/user.service';
import { UserModule } from './modules/users/user.module';
import { ManagerModule } from './modules/manager/manager.module';
import { ResearcherModule } from './modules/researcher/researcher.module';
import { HealthProfessionalModule } from './modules/health-professional/health-professional.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { HealthUnitModule } from './modules/health-unit/health-unit.module';
import { InstitutionModule } from './modules/institution/institution.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import provideGlobalAppGuards from './modules/auth/providers/global-guards.provider';
import { ParticipantModule } from './modules/participant/participant.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { APP_FILTER } from '@nestjs/core';
import { PrismaClientExceptionFilter } from './shared/prisma/filters/prisma-client-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig],
    }),
    PrismaModule,
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
    DashboardModule,
  ],
  providers: [
    ...provideGlobalAppGuards(),
    UserService,
    {
      provide: APP_FILTER,
      useClass: PrismaClientExceptionFilter,
    },
  ],
})
export class AppModule {}
