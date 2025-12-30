import { Module } from '@nestjs/common';
import { PlmApiKeysController } from './plm-api-keys.controller';
import { PlmApiKeysService } from './plm-api-keys.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlmApiKeysController],
  providers: [PlmApiKeysService],
  exports: [PlmApiKeysService],
})
export class PlmApiKeysModule {}
