import { Module } from '@nestjs/common';
import { StageTriggersController } from './stage-triggers.controller';
import { StageTriggersService } from './stage-triggers.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StageTriggersController],
  providers: [StageTriggersService],
  exports: [StageTriggersService],
})
export class StageTriggersModule {}
