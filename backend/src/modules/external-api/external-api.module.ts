import { Module } from '@nestjs/common';
import { ExternalApiController } from './external-api.controller';
import { ExternalApiService } from './external-api.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PlmApiKeysModule } from '../plm-api-keys';

@Module({
  imports: [PrismaModule, PlmApiKeysModule],
  controllers: [ExternalApiController],
  providers: [ExternalApiService],
  exports: [ExternalApiService],
})
export class ExternalApiModule {}
