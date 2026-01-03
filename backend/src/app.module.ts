import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';

import { PrismaModule } from './prisma';
import { GlobalExceptionFilter } from './common/filters';
import { AuthModule } from './auth';

import { TenantsModule } from './modules/tenants';
import { FormsModule } from './modules/forms';
import { PipelinesModule } from './modules/pipelines';
import { StagesModule } from './modules/stages';
import { CardsModule } from './modules/cards';
import { AutomationsModule } from './modules/automations';
import { AppFeaturesModule } from './modules/app-features';
import { ExternalFormsModule } from './modules/external-forms';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { StageTriggersModule } from './modules/stage-triggers/stage-triggers.module';
import { PlmApiKeysModule } from './modules/plm-api-keys';
import { ExternalApiModule } from './modules/external-api';
import { UserGroupsModule } from './modules/user-groups';
import { PipelinePermissionsModule } from './modules/pipeline-permissions';
import { ConversationsModule } from './modules/conversations/conversations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    FormsModule,
    PipelinesModule,
    StagesModule,
    CardsModule,
    AutomationsModule,
    AppFeaturesModule,
    ExternalFormsModule,
    IntegrationsModule,
    StageTriggersModule,
    PlmApiKeysModule,
    ExternalApiModule,
    UserGroupsModule,
    PipelinePermissionsModule,
    ConversationsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
