import { PartialType } from '@nestjs/mapped-types';
import { CreateQuestionnaireDto } from './create-questionnaire.dto';

// O PartialType torna todos os campos do Create opcionais automaticamente
export class UpdateQuestionnaireDto extends PartialType(
  CreateQuestionnaireDto,
) {}
