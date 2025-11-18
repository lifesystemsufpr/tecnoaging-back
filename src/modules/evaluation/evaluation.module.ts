import { Module } from '@nestjs/common';
import { EvaluationService } from './services/evaluation.service';
import { EvaluationController } from './evaluation.controller';

@Module({
  controllers: [EvaluationController],
  providers: [EvaluationService],
})
export class EvaluationModule {}
