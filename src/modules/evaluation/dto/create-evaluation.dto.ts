import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsUUID,
  IsDate,
  IsNumber,
} from 'class-validator';
import { TypeEvaluation } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

// --- DTO Auxiliar para os dados do sensor ---
export class CreateSensorDataDto {
  @ApiProperty({
    description: 'Timestamp da leitura do sensor',
    example: '2025-09-01T10:30:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  timestamp: Date;

  @ApiProperty({ example: 0.123 }) @IsNumber() @IsNotEmpty() accel_x: number;
  @ApiProperty({ example: -0.456 }) @IsNumber() @IsNotEmpty() accel_y: number;
  @ApiProperty({ example: 0.656 }) @IsNumber() @IsNotEmpty() accel_z: number;
  @ApiProperty({ example: 1.234 }) @IsNumber() @IsNotEmpty() gyro_x: number;
  @ApiProperty({ example: -2.345 }) @IsNumber() @IsNotEmpty() gyro_y: number;
  @ApiProperty({ example: 0.789 }) @IsNumber() @IsNotEmpty() gyro_z: number;
}

// --- Função de Transformação ---
const transformEvaluationType = ({ value }: { value: string }) => {
  if (value === '5TSTS') return 'FTSTS';
  if (value === '30TSTS') return 'TTSTS';
  return value;
};

// --- DTO Principal de Criação ---
export class CreateEvaluationDto {
  @ApiProperty({ example: 'FTSTS', enum: TypeEvaluation })
  @IsEnum(TypeEvaluation)
  @Transform(transformEvaluationType)
  @IsNotEmpty()
  type: TypeEvaluation;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  date: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  time_init: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  time_end: Date;

  @ApiProperty({ example: 'uuid-do-participante' })
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  participantId: string;

  @ApiProperty({ example: 'uuid-do-profissional' })
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  healthProfessionalId: string;

  @ApiProperty({ example: 'uuid-da-unidade' })
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  healthcareUnitId: string;

  @ApiProperty({ type: [CreateSensorDataDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSensorDataDto)
  @IsNotEmpty()
  sensorData: CreateSensorDataDto[];
}
