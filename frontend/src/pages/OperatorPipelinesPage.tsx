import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Loader2,
  FolderOpen,
  ChevronRight,
  Eye,
  Edit3,
  Settings,
  Shield,
  Calendar,
  Users,
} from 'lucide-react';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import type { PublishedPipeline, PipelineRole } from '../types';

const ROLE_CONFIG: Record<PipelineRole, { label: string; color: string; icon: typeof Eye }> = {
  VIEWER: { label: 'Visualizador', color: 'bg-gray-100 text-gray-700', icon: Eye },
  OPERATOR: { label: 'Operador', color: 'bg-blue-100 text-blue-700', icon: Edit3 },
  SUPERVISOR: { label: 'Supervisor', color: 'bg-purple-100 text-purple-700', icon: Settings },
  ADMIN: { label: 'Administrador', color: 'bg-green-100 text-green-700', icon: Shield },
};

export function OperatorPipelinesPage() {
  const navigate = useNavigate();
  const { organization } = useTenant();

  const [pipelinesByProject, setPipelinesByProject] = useState<Record<string, PublishedPipeline[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPipelines();
  }, [organization]);

  const loadPipelines = async () => {
    try {
      setLoading(true);
      const data = await api.getPublishedPipelinesByProject();
      setPipelinesByProject(data);
      // Expand all projects by default
      setExpandedProjects(new Set(Object.keys(data)));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar pipelines');
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (projectName: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectName)) {
      newExpanded.delete(projectName);
    } else {
      newExpanded.add(projectName);
    }
    setExpandedProjects(newExpanded);
  };

  const handleOpenPipeline = (pipeline: PublishedPipeline) => {
    navigate(`/kanban/${pipeline.id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const projectNames = Object.keys(pipelinesByProject).sort();
  const totalPipelines = Object.values(pipelinesByProject).reduce(
    (sum, pipelines) => sum + pipelines.length,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        <p>{error}</p>
        <button onClick={loadPipelines} className="mt-2 text-sm underline">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Layers className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meus Pipelines</h1>
            <p className="text-sm text-gray-500">
              Pipelines publicados aos quais você tem acesso ({totalPipelines})
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {projectNames.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhum pipeline disponível</h3>
          <p className="text-gray-500 mt-1 max-w-md mx-auto">
            Você ainda não tem acesso a nenhum pipeline publicado.
            Entre em contato com o administrador para solicitar acesso.
          </p>
        </div>
      ) : (
        /* Projects List */
        <div className="space-y-4">
          {projectNames.map((projectName) => {
            const pipelines = pipelinesByProject[projectName];
            const isExpanded = expandedProjects.has(projectName);

            return (
              <div key={projectName} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Project Header */}
                <button
                  onClick={() => toggleProject(projectName)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FolderOpen className="w-5 h-5 text-yellow-500" />
                    <div className="text-left">
                      <h2 className="font-semibold text-gray-900">{projectName}</h2>
                      <p className="text-sm text-gray-500">
                        {pipelines.length} pipeline{pipelines.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {/* Pipelines List */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {pipelines.map((pipeline) => {
                      const roleConfig = ROLE_CONFIG[pipeline.role];
                      const RoleIcon = roleConfig.icon;

                      return (
                        <div
                          key={pipeline.id}
                          className="flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-medium text-gray-900 truncate">
                                {pipeline.name}
                              </h3>
                              <span
                                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleConfig.color}`}
                              >
                                <RoleIcon className="w-3 h-3" />
                                <span>{roleConfig.label}</span>
                              </span>
                            </div>
                            {pipeline.description && (
                              <p className="text-sm text-gray-500 mt-1 truncate">
                                {pipeline.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                              {pipeline.publishedVersion && (
                                <span className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>
                                    Publicado em {formatDate(pipeline.publishedVersion.publishedAt)}
                                  </span>
                                </span>
                              )}
                              <span className="flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>via {pipeline.groupName}</span>
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleOpenPipeline(pipeline)}
                            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                          >
                            <span>Abrir</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Níveis de Permissão</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Object.entries(ROLE_CONFIG) as [PipelineRole, typeof ROLE_CONFIG[PipelineRole]][]).map(
            ([role, config]) => {
              const Icon = config.icon;
              return (
                <div key={role} className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{config.label}</span>
                  </span>
                </div>
              );
            }
          )}
        </div>
        <div className="mt-3 text-xs text-gray-500 space-y-1">
          <p><strong>Visualizador:</strong> Pode apenas visualizar cards</p>
          <p><strong>Operador:</strong> Pode criar e mover cards</p>
          <p><strong>Supervisor:</strong> Pode editar formulários</p>
          <p><strong>Administrador:</strong> Controle total do pipeline</p>
        </div>
      </div>
    </div>
  );
}
