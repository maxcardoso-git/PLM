import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ExternalFormConfig {
  baseUrl: string;
  apiKey: string;
}

export interface ProxyConfig {
  baseUrl: string;
  endpoint: string;
  apiKey: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, any>;
}

@Injectable()
export class ExternalFormsService {
  constructor(private readonly httpService: HttpService) {}

  async proxy(config: ProxyConfig): Promise<any> {
    const url = `${config.baseUrl}${config.endpoint}`;
    const headers = {
      'X-API-Key': config.apiKey,
      'Content-Type': 'application/json',
    };

    try {
      let response;
      switch (config.method) {
        case 'POST':
          response = await firstValueFrom(
            this.httpService.post(url, config.body || {}, { headers, timeout: 10000 }),
          );
          break;
        case 'PUT':
          response = await firstValueFrom(
            this.httpService.put(url, config.body || {}, { headers, timeout: 10000 }),
          );
          break;
        case 'DELETE':
          response = await firstValueFrom(
            this.httpService.delete(url, { headers, timeout: 10000 }),
          );
          break;
        default:
          response = await firstValueFrom(
            this.httpService.get(url, { headers, timeout: 10000 }),
          );
      }
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new HttpException(
          {
            message: 'External API error',
            statusCode: error.response.status,
            details: error.response.data,
          },
          error.response.status,
        );
      }
      throw new HttpException(
        {
          message: 'Failed to connect to external API',
          details: error.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async listForms(config: ExternalFormConfig): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${config.baseUrl}/data-entry-forms/external/list`, {
          headers: {
            'X-API-Key': config.apiKey,
          },
          timeout: 10000,
        }),
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new HttpException(
          {
            message: 'External API error',
            statusCode: error.response.status,
            details: error.response.data,
          },
          error.response.status,
        );
      }
      throw new HttpException(
        {
          message: 'Failed to connect to external Forms API',
          details: error.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getFormSchema(config: ExternalFormConfig, formId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${config.baseUrl}/data-entry-forms/external/${formId}/schema`, {
          headers: {
            'X-API-Key': config.apiKey,
          },
          timeout: 10000,
        }),
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new HttpException(
          {
            message: 'External API error',
            statusCode: error.response.status,
            details: error.response.data,
          },
          error.response.status,
        );
      }
      throw new HttpException(
        {
          message: 'Failed to connect to external Forms API',
          details: error.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async submitForm(
    config: ExternalFormConfig,
    formId: string,
    data: Record<string, any>,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${config.baseUrl}/data-entry-forms/external/${formId}/submit`,
          data,
          {
            headers: {
              'X-API-Key': config.apiKey,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          },
        ),
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new HttpException(
          {
            message: 'External API error',
            statusCode: error.response.status,
            details: error.response.data,
          },
          error.response.status,
        );
      }
      throw new HttpException(
        {
          message: 'Failed to connect to external Forms API',
          details: error.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
