import { Module } from '@nestjs/common';
import { ResearcherService } from './researcher.service';
import { ResearcherController } from './researcher.controller';
import { UserModule } from '../users/user.module';

@Module({
  imports: [UserModule],
  controllers: [ResearcherController],
  providers: [ResearcherService],
})
export class ResearcherModule {}
