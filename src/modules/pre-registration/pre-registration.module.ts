import { Module } from '@nestjs/common';
import { PreRegistrationController } from './pre-registration.controller';
import { PreRegistrationService } from './pre-registration.service';

@Module({
  controllers: [PreRegistrationController],
  providers: [PreRegistrationService],
})
export class PreRegistrationModule {}
