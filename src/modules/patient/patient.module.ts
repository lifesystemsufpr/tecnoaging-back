import { Module } from '@nestjs/common';
import { ParticipantService } from './participant.service';
import { ParticipantController } from './participant.controller';
import { UserModule } from '../users/user.module';

@Module({
  controllers: [ParticipantController],
  providers: [ParticipantService],
  imports: [UserModule],
})
export class ParticipantModule {}
