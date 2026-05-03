import { Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { EvaluationCronService } from './evaluation-cron.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [EvaluationController],
  providers: [EvaluationService, EvaluationCronService],
})
export class EvaluationModule {}
