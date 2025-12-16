import { Module } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { QuestionnaireController } from './questionnaire.controller';

@Module({
  imports: [],
  controllers: [QuestionnaireController],
  providers: [QuestionnaireService],
  exports: [],
})
export class QuestionnairesModule {}
