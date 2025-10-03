import { Module } from '@nestjs/common';
import { HealthProfessionalService } from './health-professional.service';
import { HealthProfessionalController } from './health-professional.controller';
import { UserModule } from '../users/user.module';

@Module({
  controllers: [HealthProfessionalController],
  providers: [HealthProfessionalService],
  imports: [UserModule],
})
export class HealthProfessionalModule {}
