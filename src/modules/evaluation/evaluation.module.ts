import { Module } from '@nestjs/common';
import { EvaluationService } from './services/evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { SensorDataProcessorService } from './services/sensor-data-processor.service';

@Module({
  controllers: [EvaluationController],
  providers: [EvaluationService, SensorDataProcessorService],
})
export class EvaluationModule {}
