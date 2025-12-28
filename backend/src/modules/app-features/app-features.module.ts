import { Module } from '@nestjs/common';
import { AppFeaturesController } from './app-features.controller';
import { AppFeaturesService } from './app-features.service';

@Module({
  controllers: [AppFeaturesController],
  providers: [AppFeaturesService],
  exports: [AppFeaturesService],
})
export class AppFeaturesModule {}
