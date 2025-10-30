import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsNotEmpty, IsDate } from 'class-validator';

export class CreateSensorDataDto {
  @ApiProperty({
    description: 'Timestamp when the sensor data was recorded',
    example: '2025-09-01T10:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  timestamp: Date;

  @ApiProperty({
    description: 'Acceleration data on X axis',
    example: 0.123,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  accel_x: number;

  @ApiProperty({
    description: 'Acceleration data on Y axis',
    example: -0.456,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  accel_y: number;

  @ApiProperty({
    description: 'Acceleration data on Z axis',
    example: 0.656,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  accel_z: number;

  @ApiProperty({
    description: 'Gyroscope data on X axis',
    example: 1.234,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  gyro_x: number;

  @ApiProperty({
    description: 'Gyroscope data on Y axis',
    example: -2.345,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  gyro_y: number;

  @ApiProperty({
    description: 'Gyroscope data on Z axis',
    example: 0.789,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  gyro_z: number;
}
