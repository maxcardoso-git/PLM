import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppFeaturesService } from './app-features.service';
import { CreateAppFeatureDto, UpdateAppFeatureDto } from './dto';

@ApiTags('App Features')
@Controller('app-features')
export class AppFeaturesController {
  constructor(private readonly appFeaturesService: AppFeaturesService) {}

  @Get('manifest')
  @ApiOperation({ summary: 'Get app features manifest (public endpoint for TAH)' })
  @ApiResponse({ status: 200, description: 'Application manifest with all features' })
  getManifest() {
    return this.appFeaturesService.getManifest();
  }

  @Get()
  @ApiOperation({ summary: 'List all features' })
  @ApiResponse({ status: 200, description: 'List of features' })
  findAll() {
    const items = this.appFeaturesService.findAll();
    return { items };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feature by ID' })
  @ApiResponse({ status: 200, description: 'Feature found' })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  findOne(@Param('id') id: string) {
    return this.appFeaturesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new feature' })
  @ApiResponse({ status: 201, description: 'Feature created' })
  @ApiResponse({ status: 409, description: 'Feature already exists' })
  create(@Body() dto: CreateAppFeatureDto) {
    return this.appFeaturesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a feature' })
  @ApiResponse({ status: 200, description: 'Feature updated' })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  update(@Param('id') id: string, @Body() dto: UpdateAppFeatureDto) {
    return this.appFeaturesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a feature' })
  @ApiResponse({ status: 200, description: 'Feature deleted' })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  remove(@Param('id') id: string) {
    return this.appFeaturesService.remove(id);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Reset features to default (admin only)' })
  @ApiResponse({ status: 200, description: 'Features seeded' })
  seed() {
    return this.appFeaturesService.seed();
  }
}
