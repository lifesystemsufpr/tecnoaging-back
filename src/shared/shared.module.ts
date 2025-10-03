import { Module } from '@nestjs/common';
import { HealthcheckController } from './controllers/healthcheck.controller';
import { TerminusModule } from '@nestjs/terminus';

@Module({ controllers: [HealthcheckController], imports: [TerminusModule] })
export class SharedModule {}
