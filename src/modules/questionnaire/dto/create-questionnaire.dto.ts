import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '@prisma/client';

// 1. DTO da Opção (A ponta da árvore)
export class CreateQuestionOptionDto {
  @IsString()
  @IsNotEmpty()
  label: string; // Ex: "Sim", "Não"

  @IsInt()
  @IsNotEmpty()
  score: number; // Ex: 0 ou 4

  @IsInt()
  @Min(1)
  order: number;
}

// 2. DTO da Pergunta
export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  statement: string; // O texto da pergunta

  @IsInt()
  @Min(1)
  order: number;

  @IsEnum(QuestionType)
  type: QuestionType; // MULTIPLE_CHOICE, SCALE, etc.

  @IsBoolean()
  @IsOptional()
  required?: boolean;

  // Uma pergunta tem várias opções (Sim, Não, etc)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  options: CreateQuestionOptionDto[];
}

// 3. DTO do SubGrupo (Opcional, mas existe no schema)
export class CreateQuestionSubGroupDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}

// 4. DTO do Grupo (Ex: "AVD", "Mobilidade")
export class CreateQuestionGroupDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsString()
  @IsOptional()
  description?: string;

  // Um grupo pode ter perguntas diretas...
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];

  // ...ou subgrupos
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionSubGroupDto)
  subGroups?: CreateQuestionSubGroupDto[];
}

// 5. DTO Principal (O Questionário em si)
export class CreateQuestionnaireDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  slug: string; // Ex: "ivcf-20"

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionGroupDto)
  groups: CreateQuestionGroupDto[];
}
