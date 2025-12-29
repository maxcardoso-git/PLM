import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';

import { PrismaModule } from './prisma';
import { GlobalExceptionFilter } from './common/filters';

import { TenantsModule } from './modules/tenants';
import { FormsModule } from './modules/forms';
import { PipelinesModule } from './modules/pipelines';
import { StagesModule } from './modules/stages';
import { CardsModule } from './modules/cards';
import { AutomationsModule } from './modules/automations';
import { AppFeaturesModule } from './modules/app-features';
import { ExternalFormsModule } from './modules/external-forms';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    TenantsModule,
    FormsModule,
    PipelinesModule,
    StagesModule,
    CardsModule,
    AutomationsModule,
    AppFeaturesModule,
    ExternalFormsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
