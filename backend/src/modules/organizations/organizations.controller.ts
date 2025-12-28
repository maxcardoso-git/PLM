import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto';
import { TenantGuard } from '../../common/guards';
import { TenantId } from '../../common/decorators';

@ApiTags('Tenancy')
@Controller('organizations')
@UseGuards(TenantGuard)
@ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Tenant UUID' })
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create organization' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  create(@TenantId() tenantId: string, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List organizations for tenant' })
  @ApiResponse({ status: 200, description: 'List of organizations' })
  async findAll(@TenantId() tenantId: string) {
    const items = await this.organizationsService.findAll(tenantId);
    return { items };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiResponse({ status: 200, description: 'Organization found' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  @ApiResponse({ status: 200, description: 'Organization updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateOrganizationDto>,
  ) {
    return this.organizationsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization' })
  @ApiResponse({ status: 200, description: 'Organization deleted' })
  remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.remove(tenantId, id);
  }
}
