import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsUUID,
  IsDate,
} from 'class-validator';
import { CreateSensorDataDto } from './create-sensor-data.dto';
import { TypeEvaluation } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

const transformEvaluationType = ({ value }: { value: string }) => {
  if (value === '5TSTS') {
    return 'FTSTS';
  }
  if (value === '30TSTS') {
    return 'TTSTS';
  }
  return value;
};

export class CreateEvaluationDto {
  @ApiProperty({ example: 'FTSTS' })
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

  @ApiProperty({ example: '9526690b-e2e4-42bb-bf14-7c4c92dd70e3' })
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ example: '1633396f-e11f-4017-9caf-fef3538c15ac' })
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  healthProfessionalId: string;

  @ApiProperty({ example: '6cd3a9bf-17fa-4850-a326-8355872fd6c2' })
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
