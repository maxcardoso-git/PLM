import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Workflow, Users, AlertCircle, Settings, Play, FolderOpen, RefreshCw, Trash2, Lightbulb, Target, BookOpen, Zap } from 'lucide-react';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useSettings } from '../context/SettingsContext';
import { Modal } from '../components/ui';
import type { Pipeline } from '../types';
import {
  HowItWorksModal,
  HowItWorksButton,
  InfoCard,
  FeatureList,
  ExampleBox,
  RulesList,
  type HowItWorksContent,
} from '../components/HowItWorksModal';

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

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export function PipelinesPage() {
  const { organization } = useTenant();
  const { settings, isProjectsConfigured } = useSettings();
  const { t } = useTranslation();
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
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; pipeline: Pipeline | null }>({ show: false, pipeline: null });
  const [deleting, setDeleting] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const howItWorksContent: HowItWorksContent = {
    title: 'Pipelines',
    subtitle: 'Gerencie seus fluxos de trabalho e processos',
    sections: [
      {
        id: 'concept',
        title: 'Conceito',
        icon: <Lightbulb size={18} />,
        content: (
          <div className="space-y-4">
            <p>
              Um <strong>Pipeline</strong> é um fluxo de trabalho que define as etapas (stages) pelas quais
              um item de trabalho (card) deve passar até sua conclusão.
            </p>
            <InfoCard title="O que é um Pipeline?">
              Pense em um pipeline como uma linha de produção digital. Cada card representa uma unidade de trabalho
              que se move através de diferentes etapas (stages), desde o início até a conclusão do processo.
            </InfoCard>
            <p>
              Pipelines podem ser organizados por <strong>Projetos</strong>, facilitando o agrupamento de
              processos relacionados e a navegação entre eles.
            </p>
          </div>
        ),
      },
      {
        id: 'features',
        title: 'Funcionalidades',
        icon: <Zap size={18} />,
        content: (
          <div className="space-y-4">
            <p>Na tela de Pipelines você pode:</p>
            <FeatureList
              items={[
                { text: 'Criar novos pipelines com chave única, nome e descrição' },
                { text: 'Associar pipelines a projetos para melhor organização' },
                { text: 'Visualizar o status de cada pipeline (rascunho, publicado, arquivado)' },
                { text: 'Filtrar pipelines por status usando as abas' },
                { text: 'Acessar o editor de configuração de cada pipeline' },
                { text: 'Abrir o quadro Kanban de pipelines publicados' },
                { text: 'Excluir pipelines que não possuem cards' },
              ]}
            />
            <InfoCard title="Dica" variant="info">
              Use a aba "Publicados" para ver apenas os pipelines prontos para uso,
              ou "Rascunhos" para ver os que ainda estão em desenvolvimento.
            </InfoCard>
          </div>
        ),
      },
      {
        id: 'rules',
        title: 'Regras',
        icon: <BookOpen size={18} />,
        content: (
          <div className="space-y-4">
            <p>Regras importantes sobre Pipelines:</p>
            <RulesList
              rules={[
                'A chave (key) do pipeline deve ser única dentro da organização',
                'Apenas pipelines publicados aparecem no menu para acesso ao Kanban',
                'Não é possível excluir um pipeline que possui cards',
                'Cada pipeline pode ter múltiplas versões (draft, published, archived)',
                'Somente uma versão pode estar publicada por vez',
                'Após publicar, as alterações na versão são bloqueadas',
              ]}
            />
          </div>
        ),
      },
      {
        id: 'examples',
        title: 'Exemplos',
        icon: <Target size={18} />,
        content: (
          <div className="space-y-4">
            <p>Exemplos de uso de Pipelines:</p>
            <ExampleBox title="Atendimento ao Cliente">
              Crie um pipeline com stages como: "Novo Ticket", "Em Análise", "Aguardando Cliente",
              "Em Resolução" e "Concluído". Cada ticket de suporte é um card que percorre esse fluxo.
            </ExampleBox>
            <ExampleBox title="Aprovação de Documentos">
              Configure stages como: "Pendente", "Em Revisão", "Aguardando Aprovação", "Aprovado"
              ou "Rejeitado". Use regras de transição para garantir que documentos tenham comentários
              antes de serem rejeitados.
            </ExampleBox>
            <ExampleBox title="Processo de Vendas">
              Estruture o funil com: "Lead", "Qualificação", "Proposta Enviada", "Negociação",
              "Fechado Ganho" ou "Fechado Perdido". Anexe formulários para capturar dados em cada etapa.
            </ExampleBox>
          </div>
        ),
      },
    ],
  };

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
        let projectsList: Project[] = [];
        if (Array.isArray(data)) {
          projectsList = data;
        } else if (data && Array.isArray(data.items)) {
          projectsList = data.items;
        } else if (data && Array.isArray(data.data)) {
          projectsList = data.data;
        }
        setProjects(projectsList);
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

  const handleDelete = async () => {
    if (!deleteModal.pipeline) return;

    setDeleting(true);
    setError(null);
    try {
      await api.deletePipeline(deleteModal.pipeline.id);
      setDeleteModal({ show: false, pipeline: null });
      fetchPipelines(activeTab);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || t('pipelines.failedToDelete');
      setError(message);
    } finally {
      setDeleting(false);
    }
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

  const pipelinesByProject: PipelinesByProject[] = (() => {
    const grouped: Record<string, PipelinesByProject> = {};

    pipelines.forEach(pipeline => {
      const projectId = pipeline.projectId || 'no-project';
      const projectName = pipeline.projectName || t('pipelines.noProject');

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
          <h2 className="text-xl font-semibold text-gray-600">{t('pipelines.selectOrganization')}</h2>
          <p className="text-gray-500 mt-2">{t('pipelines.selectOrgMsg')}</p>
        </div>
      </div>
    );
  }

  const tabs: { key: TabFilter; labelKey: string }[] = [
    { key: 'all', labelKey: 'pipelines.allTab' },
    { key: 'published', labelKey: 'pipelines.publishedTab' },
    { key: 'draft', labelKey: 'pipelines.draftsTab' },
  ];

  return (
    <div className="p-6">
      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
        content={howItWorksContent}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pipelines.title')}</h1>
          <p className="text-gray-500 mt-1">
            {pipelines.length} pipeline{pipelines.length !== 1 ? 's' : ''} - {pipelinesByProject.length} {pipelinesByProject.length !== 1 ? t('pipelines.projectPlural') : t('pipelines.projectSingular')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HowItWorksButton onClick={() => setShowHowItWorks(true)} />
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
            {t('pipelines.newPipeline')}
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
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">{t('pipelines.loadingPipelines')}</p>
        </div>
      ) : pipelines.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <Workflow size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-600">
            {activeTab === 'all'
              ? t('pipelines.noPipelinesYet')
              : activeTab === 'published'
              ? t('pipelines.noPublishedPipelines')
              : t('pipelines.noDrafts')}
          </h2>
          <p className="text-gray-500 mt-1">
            {activeTab === 'all'
              ? t('pipelines.createFirstPipeline')
              : activeTab === 'published'
              ? t('pipelines.publishPipelineToSee')
              : t('pipelines.draftPipelinesAppear')}
          </p>
          {activeTab === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary mt-4"
            >
              <Plus size={18} className="mr-2" />
              {t('pipelines.createPipeline')}
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
                          {pipeline.publishedVersion ? `v${pipeline.publishedVersion}` : t('pipelines.notPublished')}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDeleteModal({ show: true, pipeline })}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-md transition-colors"
                            title={t('pipelines.deletePipeline')}
                          >
                            <Trash2 size={14} />
                          </button>
                          <Link
                            to={`/pipelines/${pipeline.id}/edit`}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 rounded-md transition-colors"
                            title={t('pipelines.editPipeline')}
                          >
                            <Settings size={14} />
                            {t('common.edit')}
                          </Link>
                          {pipeline.publishedVersion && (
                            <Link
                              to={`/pipelines/${pipeline.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                              title="Kanban"
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.show}
        onClose={() => {
          setDeleteModal({ show: false, pipeline: null });
          setError(null);
        }}
        title={t('pipelines.deletePipeline')}
      >
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="text-red-600" size={20} />
              </div>
              <div>
                <h4 className="font-medium text-red-800">{t('pipelines.confirmDelete')}</h4>
                <p className="text-sm text-red-700 mt-1">
                  {t('pipelines.aboutToDelete')} <strong>"{deleteModal.pipeline?.name}"</strong>.
                  {t('pipelines.cannotBeUndone')}
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            {t('pipelines.allDataDeleted')}
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setDeleteModal({ show: false, pipeline: null });
                setError(null);
              }}
              className="btn-secondary"
              disabled={deleting}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleting ? t('pipelines.deleting') : t('pipelines.deletePipeline')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Pipeline Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setError(null);
        }}
        title={t('pipelines.createPipeline')}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {isProjectsConfigured && (
            <div>
              <label className="label">{t('pipelines.project')}</label>
              <select
                value={newPipeline.projectId}
                onChange={(e) => handleProjectSelect(e.target.value)}
                className="input mt-1"
              >
                <option value="">{t('pipelines.selectProject')}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">{t('pipelines.associateProject')}</p>
            </div>
          )}

          <div>
            <label className="label">{t('pipelines.key')}</label>
            <input
              type="text"
              value={newPipeline.key}
              onChange={(e) => setNewPipeline({ ...newPipeline, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              className="input mt-1"
              placeholder={t('pipelines.keyPlaceholder')}
              required
            />
            <p className="text-xs text-gray-500 mt-1">{t('pipelines.keyDescription')}</p>
          </div>

          <div>
            <label className="label">{t('common.name')}</label>
            <input
              type="text"
              value={newPipeline.name}
              onChange={(e) => setNewPipeline({ ...newPipeline, name: e.target.value })}
              className="input mt-1"
              placeholder={t('pipelines.namePlaceholder')}
              required
            />
          </div>

          <div>
            <label className="label">{t('common.description')}</label>
            <textarea
              value={newPipeline.description}
              onChange={(e) => setNewPipeline({ ...newPipeline, description: e.target.value })}
              className="input mt-1"
              rows={3}
              placeholder={t('pipelines.descriptionPlaceholder')}
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
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={creating || !newPipeline.key || !newPipeline.name}
              className="btn-primary"
            >
              {creating ? t('pipelines.creating') : t('pipelines.createPipeline')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
