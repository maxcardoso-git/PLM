import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';

import { PrismaModule } from './prisma';
import { GlobalExceptionFilter } from './common/filters';

import { TenantsModule } from './modules/tenants';
import { OrganizationsModule } from './modules/organizations';
import { FormsModule } from './modules/forms';
import { PipelinesModule } from './modules/pipelines';
import { StagesModule } from './modules/stages';
import { CardsModule } from './modules/cards';
import { AutomationsModule } from './modules/automations';
import { AppFeaturesModule } from './modules/app-features';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    TenantsModule,
    OrganizationsModule,
    FormsModule,
    PipelinesModule,
    StagesModule,
    CardsModule,
    AutomationsModule,
    AppFeaturesModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
