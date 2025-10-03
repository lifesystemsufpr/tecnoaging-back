import { Module } from '@nestjs/common';
import { HealthUnitService } from './health-unit.service';
import { HealthUnitController } from './health-unit.controller';

@Module({
  controllers: [HealthUnitController],
  providers: [HealthUnitService],
})
export class HealthUnitModule {}
