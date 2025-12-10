import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { AgeGroup, SelfPerceptionHealth } from '@prisma/client';

export class CriarAvaliacaoIvcf20Dto {
  @ApiProperty({ description: 'ID do paciente' })
  @IsString()
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'ID do profissional de saúde' })
  @IsString()
  @IsUUID()
  healthProfessionalId: string;

  @ApiProperty({ description: 'ID da avaliação (referência)' })
  @IsString()
  @IsUUID()
  evaluationId: string;

  @ApiProperty({ description: 'Data da aplicação', example: '2025-01-19' })
  @IsDateString()
  date: string;

  // Seção 1: Idade e Auto-Percepção da Saúde
  @ApiProperty({ enum: AgeGroup, description: 'Faixa etária do paciente' })
  @IsEnum(AgeGroup)
  ageGroup: AgeGroup;

  @ApiProperty({
    enum: SelfPerceptionHealth,
    description: 'Auto-percepção da saúde',
  })
  @IsEnum(SelfPerceptionHealth)
  selfPerceptionHealth: SelfPerceptionHealth;

  // Seção 2: Atividades de Vida Diária (AVD)
  @ApiProperty({ description: 'Deixou de fazer compras por causa da saúde?' })
  @IsBoolean()
  avdInstrumentalShopping: boolean;

  @ApiProperty({
    description: 'Deixou de controlar dinheiro/pagar contas por causa da saúde?',
  })
  @IsBoolean()
  avdInstrumentalFinance: boolean;

  @ApiProperty({
    description:
      'Deixou de realizar pequenos trabalhos domésticos por causa da saúde?',
  })
  @IsBoolean()
  avdInstrumentalHousework: boolean;

  @ApiProperty({
    description: 'Deixou de tomar banho sozinho por causa da saúde?',
  })
  @IsBoolean()
  avdBasicBathing: boolean;

  // Seção 3: Cognição
  @ApiProperty({
    description: 'Algum familiar/amigo falou que está ficando esquecido?',
  })
  @IsBoolean()
  cognitionFamilyAlert: boolean;

  @ApiProperty({
    description: 'Esquecimento está piorando nos últimos meses?',
  })
  @IsBoolean()
  cognitionWorsening: boolean;

  @ApiProperty({
    description:
      'Esquecimento está impedindo a realização de alguma atividade do cotidiano?',
  })
  @IsBoolean()
  cognitionImpediment: boolean;

  // Seção 4: Humor
  @ApiProperty({
    description:
      'No último mês, ficou com desânimo, tristeza ou desesperança?',
  })
  @IsBoolean()
  humorDespair: boolean;

  @ApiProperty({
    description:
      'No último mês, perdeu o interesse em atividades anteriormente prazerosas?',
  })
  @IsBoolean()
  humorLossOfInterest: boolean;

  // Seção 5: Mobilidade
  @ApiProperty({
    description: 'Você é incapaz de manusear ou segurar pequenos objetos?',
  })
  @IsBoolean()
  mobilityFineMotor: boolean;

  @ApiProperty({
    description:
      'Você tem dificuldade para caminhar capaz de impedir a realização de alguma atividade do cotidiano?',
  })
  @IsBoolean()
  mobilityWalkingDifficulty: boolean;

  @ApiProperty({
    description: 'Você teve duas ou mais quedas no último ano?',
  })
  @IsBoolean()
  mobilityFalls: boolean;

  // Seção 6: Comunicação
  @ApiProperty({
    description: 'Você tem dificuldade para ouvir o que as pessoas falam?',
  })
  @IsBoolean()
  communicationHearing: boolean;

  @ApiProperty({
    description: 'Você tem dificuldade para se comunicar com as pessoas?',
  })
  @IsBoolean()
  communicationSpeaking: boolean;

  // Seção 7: Comorbidades
  @ApiProperty({ description: 'Você tem 5 ou mais doenças crônicas?' })
  @IsBoolean()
  comorbiditiesFiveOrMore: boolean;

  @ApiProperty({
    description: 'Você usa 5 ou mais medicamentos diferentes?',
  })
  @IsBoolean()
  comorbiditiesFiveOrMoreMeds: boolean;

  // Seção 8: Sinais de Alerta
  @ApiProperty({
    description:
      'Você perde urina ou fezes, sem querer, em algum momento?',
  })
  @IsBoolean()
  alertSignsIncontinence: boolean;

  @ApiProperty({
    description:
      'Você tem perda de peso não intencional (4,5kg ou 5% do peso corporal) nos últimos 6 meses?',
  })
  @IsBoolean()
  alertSignsWeightLoss: boolean;

  @ApiProperty({
    description: 'Você tem Índice de Massa Corporal (IMC) menor que 22 kg/m²?',
  })
  @IsBoolean()
  alertSignsLowBMI: boolean;

  @ApiProperty({
    description: 'Você tem Circunferência da panturrilha < 31 cm?',
  })
  @IsBoolean()
  alertSignsLowCalfCircumference: boolean;

  @ApiProperty({
    description:
      'Você tem Tempo gasto no teste de velocidade da marcha (4m) > 5 segundos?',
  })
  @IsBoolean()
  alertSignsSlowGaitSpeed: boolean;
}
