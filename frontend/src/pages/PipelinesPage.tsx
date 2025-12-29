import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Workflow, Users, AlertCircle, Settings, Play, FolderOpen, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useSettings } from '../context/SettingsContext';
import { Modal } from '../components/ui';
import type { Pipeline } from '../types';

type TabFilter = 'all' | 'published' | 'draft';

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface PipelinesByProject {
  projectId: string;
  projectName: string;
  pipelines: Pipeline[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export function PipelinesPage() {
  const { organization } = useTenant();
  const { settings, isProjectsConfigured } = useSettings();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [_loadingProjects, setLoadingProjects] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPipeline, setNewPipeline] = useState({ key: '', name: '', description: '', projectId: '', projectName: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const fetchProjects = async () => {
    if (!isProjectsConfigured) return;

    setLoadingProjects(true);
    try {
      const { baseUrl, listEndpoint, apiKey } = settings.externalProjects;
      const response = await fetch(`${API_BASE_URL}/external-forms/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          endpoint: listEndpoint,
          apiKey,
          method: 'GET',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.items || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchPipelines = async (filter?: TabFilter) => {
    if (!organization) return;
    setLoading(true);
    try {
      const status = filter === 'all' || !filter ? undefined : filter;
      const { items } = await api.getPipelines(status);
      setPipelines(items);

      // Auto-expand all projects
      const projectIds = new Set(items.map((p: Pipeline) => p.projectId || 'no-project'));
      setExpandedProjects(projectIds);
    } catch (err) {
      console.error('Failed to fetch pipelines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines(activeTab);
    fetchProjects();
  }, [organization, activeTab]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPipeline.key || !newPipeline.name) return;

    setCreating(true);
    setError(null);
    try {
      await api.createPipeline({
        key: newPipeline.key,
        name: newPipeline.name,
        description: newPipeline.description,
        projectId: newPipeline.projectId || undefined,
        projectName: newPipeline.projectName || undefined,
      });
      setShowCreateModal(false);
      setNewPipeline({ key: '', name: '', description: '', projectId: '', projectName: '' });
      fetchPipelines(activeTab);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to create pipeline';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    setNewPipeline({
      ...newPipeline,
      projectId,
      projectName: project?.name || '',
    });
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // Group pipelines by project
  const pipelinesByProject: PipelinesByProject[] = (() => {
    const grouped: Record<string, PipelinesByProject> = {};

    pipelines.forEach(pipeline => {
      const projectId = pipeline.projectId || 'no-project';
      const projectName = pipeline.projectName || 'Sem Projeto';

      if (!grouped[projectId]) {
        grouped[projectId] = { projectId, projectName, pipelines: [] };
      }
      grouped[projectId].pipelines.push(pipeline);
    });

    return Object.values(grouped).sort((a, b) => {
      if (a.projectId === 'no-project') return 1;
      if (b.projectId === 'no-project') return -1;
      return a.projectName.localeCompare(b.projectName);
    });
  })();

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    test: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    closed: 'bg-red-100 text-red-700',
    archived: 'bg-gray-100 text-gray-500',
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">Selecione uma Organização</h2>
          <p className="text-gray-500 mt-2">Escolha um tenant e organização na barra lateral para ver pipelines.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'published', label: 'Publicados' },
    { key: 'draft', label: 'Rascunhos' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipelines</h1>
          <p className="text-gray-500 mt-1">
            {pipelines.length} pipeline{pipelines.length !== 1 ? 's' : ''} em {pipelinesByProject.length} projeto{pipelinesByProject.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPipelines(activeTab)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus size={18} className="mr-2" />
            Novo Pipeline
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Carregando pipelines...</p>
        </div>
      ) : pipelines.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <Workflow size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-600">
            {activeTab === 'all'
              ? 'Nenhum pipeline ainda'
              : activeTab === 'published'
              ? 'Nenhum pipeline publicado'
              : 'Nenhum rascunho'}
          </h2>
          <p className="text-gray-500 mt-1">
            {activeTab === 'all'
              ? 'Crie seu primeiro pipeline para começar'
              : activeTab === 'published'
              ? 'Publique um pipeline para vê-lo aqui'
              : 'Pipelines em rascunho aparecerão aqui'}
          </p>
          {activeTab === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary mt-4"
            >
              <Plus size={18} className="mr-2" />
              Criar Pipeline
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {pipelinesByProject.map((group) => (
            <div
              key={group.projectId}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Project Header */}
              <button
                onClick={() => toggleProject(group.projectId)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <FolderOpen className="text-purple-600" size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">{group.projectName}</h3>
                    <p className="text-sm text-gray-500">
                      {group.pipelines.length} pipeline{group.pipelines.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedProjects.has(group.projectId) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Pipelines List */}
              {expandedProjects.has(group.projectId) && (
                <div className="border-t border-gray-200 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.pipelines.map((pipeline) => (
                    <div
                      key={pipeline.id}
                      className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{pipeline.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{pipeline.key}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[pipeline.lifecycleStatus]}`}>
                          {pipeline.lifecycleStatus}
                        </span>
                      </div>

                      {pipeline.description && (
                        <p className="text-sm text-gray-600 mt-3 line-clamp-2">{pipeline.description}</p>
                      )}

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                        <span className="text-xs text-gray-500">
                          {pipeline.publishedVersion ? `v${pipeline.publishedVersion}` : 'Não publicado'}
                        </span>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/pipelines/${pipeline.id}/edit`}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 rounded-md transition-colors"
                            title="Editar pipeline"
                          >
                            <Settings size={14} />
                            Editar
                          </Link>
                          {pipeline.publishedVersion && (
                            <Link
                              to={`/pipelines/${pipeline.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                              title="Ver Kanban"
                            >
                              <Play size={14} />
                              Kanban
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Pipeline Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setError(null);
        }}
        title="Criar Pipeline"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Project Selection */}
          {isProjectsConfigured && (
            <div>
              <label className="label">Projeto</label>
              <select
                value={newPipeline.projectId}
                onChange={(e) => handleProjectSelect(e.target.value)}
                className="input mt-1"
              >
                <option value="">Selecionar projeto...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Associe este pipeline a um projeto externo</p>
            </div>
          )}

          <div>
            <label className="label">Key</label>
            <input
              type="text"
              value={newPipeline.key}
              onChange={(e) => setNewPipeline({ ...newPipeline, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              className="input mt-1"
              placeholder="ex: vendas_pipeline"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Identificador único para este pipeline</p>
          </div>

          <div>
            <label className="label">Nome</label>
            <input
              type="text"
              value={newPipeline.name}
              onChange={(e) => setNewPipeline({ ...newPipeline, name: e.target.value })}
              className="input mt-1"
              placeholder="ex: Pipeline de Vendas"
              required
            />
          </div>

          <div>
            <label className="label">Descrição</label>
            <textarea
              value={newPipeline.description}
              onChange={(e) => setNewPipeline({ ...newPipeline, description: e.target.value })}
              className="input mt-1"
              rows={3}
              placeholder="Descrição opcional..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setError(null);
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating || !newPipeline.key || !newPipeline.name}
              className="btn-primary"
            >
              {creating ? 'Criando...' : 'Criar Pipeline'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
