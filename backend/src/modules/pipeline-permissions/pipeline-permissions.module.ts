import { Module } from '@nestjs/common';
import { PipelinePermissionsController } from './pipeline-permissions.controller';
import { PipelinePermissionsService } from './pipeline-permissions.service';
import { PrismaModule } from '../../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [PipelinePermissionsController],
  providers: [PipelinePermissionsService],
  exports: [PipelinePermissionsService],
})
export class PipelinePermissionsModule {}
