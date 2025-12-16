import {
  IsNotEmpty,
  IsUUID,
  IsArray,
  ValidateNested,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDto {
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @IsUUID()
  @IsOptional()
  selectedOptionId?: string;

  @IsString()
  @IsOptional()
  valueText?: string;
}

export class CreateResponseDto {
  @IsUUID()
  @IsNotEmpty()
  participantId: string;

  @IsUUID()
  @IsNotEmpty()
  healthProfessionalId: string;

  @IsUUID()
  @IsNotEmpty()
  questionnaireId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
