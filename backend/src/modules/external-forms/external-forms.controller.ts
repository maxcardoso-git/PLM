import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';
import { ExternalFormsService } from './external-forms.service';

interface ProxyRequestDto {
  baseUrl: string;
  endpoint: string;
  apiKey: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, any>;
}

@ApiTags('External Forms Proxy')
@Controller('external-forms')
export class ExternalFormsController {
  constructor(private readonly externalFormsService: ExternalFormsService) {}

  @Post('proxy')
  @ApiOperation({ summary: 'Generic proxy to external API' })
  @ApiBody({ description: 'Proxy request configuration' })
  @ApiResponse({ status: 200, description: 'Response from external API' })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 502, description: 'External API connection failed' })
  async proxy(@Body() dto: ProxyRequestDto) {
    console.log('[DEBUG external-forms/proxy] Received request:', JSON.stringify(dto, null, 2));
    if (!dto.baseUrl || !dto.endpoint || !dto.apiKey) {
      console.log('[DEBUG external-forms/proxy] Missing required fields:', {
        baseUrl: !!dto?.baseUrl,
        endpoint: !!dto?.endpoint,
        apiKey: !!dto?.apiKey,
      });
      throw new BadRequestException('baseUrl, endpoint, and apiKey are required');
    }

    return this.externalFormsService.proxy({
      baseUrl: dto.baseUrl.replace(/\/$/, ''),
      endpoint: dto.endpoint.startsWith('/') ? dto.endpoint : `/${dto.endpoint}`,
      apiKey: dto.apiKey,
      method: dto.method || 'GET',
      body: dto.body,
    });
  }

  @Get('list')
  @ApiOperation({ summary: 'List forms from external API (proxy)' })
  @ApiHeader({ name: 'X-External-Api-Url', required: true, description: 'External Forms API base URL' })
  @ApiHeader({ name: 'X-External-Api-Key', required: true, description: 'External Forms API key' })
  @ApiResponse({ status: 200, description: 'List of forms from external API' })
  @ApiResponse({ status: 400, description: 'Missing required headers' })
  @ApiResponse({ status: 502, description: 'External API connection failed' })
  async listForms(
    @Headers('x-external-api-url') baseUrl: string,
    @Headers('x-external-api-key') apiKey: string,
  ) {
    if (!baseUrl || !apiKey) {
      throw new BadRequestException('X-External-Api-Url and X-External-Api-Key headers are required');
    }

    return this.externalFormsService.listForms({
      baseUrl: baseUrl.replace(/\/$/, ''),
      apiKey,
    });
  }

  @Get(':formId/schema')
  @ApiOperation({ summary: 'Get form schema from external API (proxy)' })
  @ApiHeader({ name: 'X-External-Api-Url', required: true, description: 'External Forms API base URL' })
  @ApiHeader({ name: 'X-External-Api-Key', required: true, description: 'External Forms API key' })
  @ApiResponse({ status: 200, description: 'Form schema from external API' })
  @ApiResponse({ status: 400, description: 'Missing required headers' })
  @ApiResponse({ status: 502, description: 'External API connection failed' })
  async getFormSchema(
    @Param('formId') formId: string,
    @Headers('x-external-api-url') baseUrl: string,
    @Headers('x-external-api-key') apiKey: string,
  ) {
    if (!baseUrl || !apiKey) {
      throw new BadRequestException('X-External-Api-Url and X-External-Api-Key headers are required');
    }

    return this.externalFormsService.getFormSchema(
      {
        baseUrl: baseUrl.replace(/\/$/, ''),
        apiKey,
      },
      formId,
    );
  }

  @Post(':formId/submit')
  @ApiOperation({ summary: 'Submit form data to external API (proxy)' })
  @ApiHeader({ name: 'X-External-Api-Url', required: true, description: 'External Forms API base URL' })
  @ApiHeader({ name: 'X-External-Api-Key', required: true, description: 'External Forms API key' })
  @ApiResponse({ status: 200, description: 'Form submission response' })
  @ApiResponse({ status: 400, description: 'Missing required headers' })
  @ApiResponse({ status: 502, description: 'External API connection failed' })
  async submitForm(
    @Param('formId') formId: string,
    @Headers('x-external-api-url') baseUrl: string,
    @Headers('x-external-api-key') apiKey: string,
    @Body() data: Record<string, any>,
  ) {
    if (!baseUrl || !apiKey) {
      throw new BadRequestException('X-External-Api-Url and X-External-Api-Key headers are required');
    }

    return this.externalFormsService.submitForm(
      {
        baseUrl: baseUrl.replace(/\/$/, ''),
        apiKey,
      },
      formId,
      data,
    );
  }
}
