import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ExternalFormsController } from './external-forms.controller';
import { ExternalFormsService } from './external-forms.service';

@Module({
  imports: [HttpModule],
  controllers: [ExternalFormsController],
  providers: [ExternalFormsService],
  exports: [ExternalFormsService],
})
export class ExternalFormsModule {}
