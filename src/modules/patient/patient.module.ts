import { Module } from '@nestjs/common';
import { PatientService } from './patient.service';
import { PatientController } from './patient.controller';
import { UserModule } from '../users/user.module';

@Module({
  controllers: [PatientController],
  providers: [PatientService],
  imports: [UserModule],
})
export class PatientModule {}
