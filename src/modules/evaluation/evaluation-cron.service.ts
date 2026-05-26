import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EvaluationService } from './evaluation.service';

@Injectable()
export class EvaluationCronService {
  private readonly logger = new Logger(EvaluationCronService.name);
  private running = false;

  constructor(private readonly evaluationService: EvaluationService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePendingEvaluations() {
    if (this.running) {
      this.logger.warn(
        'Pending evaluations job is already running — skipping this tick.',
      );
      return;
    }

    this.running = true;
    this.logger.log('Starting pending evaluations job.');

    try {
      await this.evaluationService.processPendingEvaluations();
    } catch (err) {
      this.logger.error('Pending evaluations job failed', err);
    } finally {
      this.running = false;
    }
  }
}
