import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateAppFeatureDto, UpdateAppFeatureDto } from './dto';

// In-memory storage for app features (can be migrated to database later)
export interface AppFeature {
  id: string;
  name: string;
  description?: string;
  module: string;
  path?: string;
  icon?: string;
  actions: string[];
  isPublic: boolean;
  requiresOrg: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AppFeaturesService {
  private features: Map<string, AppFeature> = new Map();
  private readonly appId = 'plm';
  private readonly appName = 'PLM - Pipeline Management';
  private readonly appVersion = '1.0.0';
  private readonly appDescription = 'Multi-tenant pipeline engine with Kanban UI, stage rules, card forms accumulation, and event hooks to Automation Plans';

  constructor() {
    this.seedDefaultFeatures();
  }

  private seedDefaultFeatures() {
    const defaultFeatures: Omit<AppFeature, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'plm.dashboard',
        name: 'Dashboard',
        description: 'Main dashboard with overview and quick links',
        module: 'core',
        path: '/',
        icon: 'LayoutDashboard',
        actions: ['read'],
        isPublic: false,
        requiresOrg: true,
      },
      {
        id: 'plm.pipelines',
        name: 'Pipelines',
        description: 'List and manage workflow pipelines',
        module: 'pipelines',
        path: '/pipelines',
        icon: 'Workflow',
        actions: ['read', 'create', 'update', 'delete'],
        isPublic: false,
        requiresOrg: true,
      },
      {
        id: 'plm.pipeline-design',
        name: 'Pipeline Design',
        description: 'Design and configure pipeline stages, forms and rules',
        module: 'pipelines',
        path: '/pipeline-design/:id',
        icon: 'Settings2',
        actions: ['read', 'update'],
        isPublic: false,
        requiresOrg: true,
      },
      {
        id: 'plm.operator-pipelines',
        name: 'Meus Pipelines',
        description: 'View and operate on published pipelines you have access to',
        module: 'pipelines',
        path: '/operator/pipelines',
        icon: 'FolderKanban',
        actions: ['read'],
        isPublic: false,
        requiresOrg: true,
      },
      {
        id: 'plm.pipelines.versions',
        name: 'Pipeline Versions',
        description: 'Manage pipeline versions and publishing',
        module: 'pipelines',
        path: '/pipelines/:id/versions',
        icon: 'GitBranch',
        actions: ['read', 'create', 'publish'],
        isPublic: false,
        requiresOrg: true,
      },
      {
        id: 'plm.pipelines.stages',
        name: 'Pipeline Stages',
        description: 'Configure pipeline stages',
        module: 'pipelines',
        path: '/pipelines/:id/stages',
        icon: 'Layers',
        actions: ['read', 'create', 'update', 'delete'],
        isPublic: false,
        requiresOrg: true,
      },
      {
        id: 'plm.kanban',
        name: 'Kanban Board',
        description: 'Visual Kanban board for card management',
        module: 'cards',
        path: '/pipelines/:id/kanban',
        icon: 'LayoutGrid',
        actions: ['read', 'create', 'update', 'move'],
        isPublic: false,
        requiresOrg: true,
      },
      {
        id: 'plm.cards',
        name: 'Cards',
        description: 'Manage pipeline cards',
        module: 'cards',
        path: '/cards',
        icon: 'StickyNote',
        actions: ['read', 'create', 'update', 'delete', 'move'],
        isPublic: false,
        requiresOrg: true,
      },
      {
        id: 'plm.forms',
        name: 'Form Definitions',
        description: 'Design and manage form definitions',
        module: 'forms',
        path: '/forms',
        icon: 'FileText',
        actions: ['read', 'create', 'update', 'delete', 'publish'],
        isPublic: false,
        requiresOrg: true,
      },
      {
        id: 'plm.external-forms',
        name: 'External Forms Integration',
        description: 'Integration with external form services',
        module: 'forms',
        path: '/external-forms',
        icon: 'FileInput',
        actions: ['read', 'configure'],
        isPublic: false,
        requiresOrg: true,
      },
      {
        id: 'plm.automations',
        name: 'Automation Bindings',
        description: 'Configure automation triggers',
        module: 'automations',
        path: '/automations',
        icon: 'Zap',
        actions: ['read', 'create', 'update', 'delete', 'enable', 'disable'],
        isPublic: false,
        requiresOrg: true,
      },
      {
        id: 'plm.tenants',
        name: 'Tenants',
        description: 'Tenant management',
        module: 'admin',
        path: '/admin/tenants',
        icon: 'Building2',
        actions: ['read', 'create', 'update', 'delete'],
        isPublic: false,
        requiresOrg: false,
      },
      {
        id: 'plm.organizations',
        name: 'Organizations',
        description: 'Organization management within tenant',
        module: 'admin',
        path: '/admin/organizations',
        icon: 'Building',
        actions: ['read', 'create', 'update', 'delete'],
        isPublic: false,
        requiresOrg: false,
      },
      {
        id: 'plm.groups',
        name: 'Grupos',
        description: 'Manage user groups and team permissions',
        module: 'admin',
        path: '/groups',
        icon: 'Users',
        actions: ['read', 'create', 'update', 'delete'],
        isPublic: false,
        requiresOrg: true,
      },
    ];

    const now = new Date();
    defaultFeatures.forEach((feature) => {
      this.features.set(feature.id, {
        ...feature,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  getManifest() {
    const featuresArray = Array.from(this.features.values());

    // Group features by module
    const moduleMap = new Map<string, { name: string; featureCount: number }>();
    featuresArray.forEach((feature) => {
      const current = moduleMap.get(feature.module) || { name: feature.module, featureCount: 0 };
      current.featureCount++;
      moduleMap.set(feature.module, current);
    });

    const modules = Array.from(moduleMap.entries()).map(([id, data]) => ({
      id,
      name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
      featureCount: data.featureCount,
    }));

    const features = featuresArray.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      module: f.module,
      path: f.path,
      icon: f.icon,
      actions: f.actions,
      isPublic: f.isPublic,
      requiresOrg: f.requiresOrg,
    }));

    return {
      appId: this.appId,
      appName: this.appName,
      version: this.appVersion,
      description: this.appDescription,
      modules,
      features,
      stats: {
        totalFeatures: features.length,
        totalModules: modules.length,
        publicFeatures: features.filter((f) => f.isPublic).length,
      },
    };
  }

  findAll() {
    return Array.from(this.features.values());
  }

  findOne(id: string) {
    const feature = this.features.get(id);
    if (!feature) {
      throw new NotFoundException(`Feature ${id} not found`);
    }
    return feature;
  }

  create(dto: CreateAppFeatureDto) {
    if (this.features.has(dto.id)) {
      throw new ConflictException(`Feature ${dto.id} already exists`);
    }

    const now = new Date();
    const feature: AppFeature = {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      module: dto.module,
      path: dto.path,
      icon: dto.icon,
      actions: dto.actions || ['read'],
      isPublic: dto.isPublic ?? false,
      requiresOrg: dto.requiresOrg ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.features.set(dto.id, feature);
    return feature;
  }

  update(id: string, dto: UpdateAppFeatureDto) {
    const feature = this.findOne(id);

    const updated: AppFeature = {
      ...feature,
      ...dto,
      updatedAt: new Date(),
    };

    this.features.set(id, updated);
    return updated;
  }

  remove(id: string) {
    const feature = this.findOne(id);
    this.features.delete(id);
    return feature;
  }

  seed() {
    this.features.clear();
    this.seedDefaultFeatures();
    return { message: 'Features seeded successfully', count: this.features.size };
  }
}
