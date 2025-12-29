import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutTemplate,
  Users,
  TrendingUp,
  Headphones,
  FolderKanban,
  Megaphone,
  ShieldCheck,
  ArrowRight,
  Copy,
  X,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { Modal } from '../components/ui';

interface Stage {
  name: string;
  color: string;
  isInitial?: boolean;
  isFinal?: boolean;
}

interface Transition {
  from: string;
  to: string;
}

interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  category: string;
  stages: Stage[];
  transitions: Transition[];
}

const templates: PipelineTemplate[] = [
  {
    id: 'recruitment',
    name: 'Recrutamento e Seleção',
    description: 'Pipeline completo para processo seletivo, desde a triagem de currículos até a contratação do candidato.',
    icon: Users,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    category: 'RH',
    stages: [
      { name: 'Triagem', color: '#94a3b8', isInitial: true },
      { name: 'Análise de Currículo', color: '#60a5fa' },
      { name: 'Entrevista RH', color: '#a78bfa' },
      { name: 'Entrevista Técnica', color: '#f472b6' },
      { name: 'Proposta', color: '#fbbf24' },
      { name: 'Contratado', color: '#22c55e', isFinal: true },
      { name: 'Reprovado', color: '#ef4444', isFinal: true },
    ],
    transitions: [
      { from: 'Triagem', to: 'Análise de Currículo' },
      { from: 'Triagem', to: 'Reprovado' },
      { from: 'Análise de Currículo', to: 'Entrevista RH' },
      { from: 'Análise de Currículo', to: 'Reprovado' },
      { from: 'Entrevista RH', to: 'Entrevista Técnica' },
      { from: 'Entrevista RH', to: 'Reprovado' },
      { from: 'Entrevista Técnica', to: 'Proposta' },
      { from: 'Entrevista Técnica', to: 'Reprovado' },
      { from: 'Proposta', to: 'Contratado' },
      { from: 'Proposta', to: 'Reprovado' },
    ],
  },
  {
    id: 'sales',
    name: 'Funil de Vendas',
    description: 'Gerencie leads e oportunidades desde a prospecção até o fechamento do negócio.',
    icon: TrendingUp,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    category: 'Vendas',
    stages: [
      { name: 'Lead Captado', color: '#94a3b8', isInitial: true },
      { name: 'Qualificação', color: '#60a5fa' },
      { name: 'Apresentação', color: '#a78bfa' },
      { name: 'Proposta Enviada', color: '#fbbf24' },
      { name: 'Negociação', color: '#f97316' },
      { name: 'Fechado Ganho', color: '#22c55e', isFinal: true },
      { name: 'Fechado Perdido', color: '#ef4444', isFinal: true },
    ],
    transitions: [
      { from: 'Lead Captado', to: 'Qualificação' },
      { from: 'Lead Captado', to: 'Fechado Perdido' },
      { from: 'Qualificação', to: 'Apresentação' },
      { from: 'Qualificação', to: 'Fechado Perdido' },
      { from: 'Apresentação', to: 'Proposta Enviada' },
      { from: 'Apresentação', to: 'Fechado Perdido' },
      { from: 'Proposta Enviada', to: 'Negociação' },
      { from: 'Proposta Enviada', to: 'Fechado Perdido' },
      { from: 'Negociação', to: 'Fechado Ganho' },
      { from: 'Negociação', to: 'Fechado Perdido' },
    ],
  },
  {
    id: 'support',
    name: 'Atendimento ao Cliente',
    description: 'Fluxo de tickets de suporte, do registro inicial à resolução e feedback do cliente.',
    icon: Headphones,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    category: 'Suporte',
    stages: [
      { name: 'Aberto', color: '#94a3b8', isInitial: true },
      { name: 'Em Análise', color: '#60a5fa' },
      { name: 'Aguardando Cliente', color: '#fbbf24' },
      { name: 'Em Desenvolvimento', color: '#a78bfa' },
      { name: 'Teste QA', color: '#f472b6' },
      { name: 'Resolvido', color: '#22c55e', isFinal: true },
      { name: 'Cancelado', color: '#ef4444', isFinal: true },
    ],
    transitions: [
      { from: 'Aberto', to: 'Em Análise' },
      { from: 'Aberto', to: 'Cancelado' },
      { from: 'Em Análise', to: 'Aguardando Cliente' },
      { from: 'Em Análise', to: 'Em Desenvolvimento' },
      { from: 'Em Análise', to: 'Resolvido' },
      { from: 'Aguardando Cliente', to: 'Em Análise' },
      { from: 'Aguardando Cliente', to: 'Cancelado' },
      { from: 'Em Desenvolvimento', to: 'Teste QA' },
      { from: 'Teste QA', to: 'Em Desenvolvimento' },
      { from: 'Teste QA', to: 'Resolvido' },
    ],
  },
  {
    id: 'project',
    name: 'Gestão de Projetos',
    description: 'Acompanhe projetos desde a concepção até a entrega final, com fases bem definidas.',
    icon: FolderKanban,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    category: 'Projetos',
    stages: [
      { name: 'Backlog', color: '#94a3b8', isInitial: true },
      { name: 'Planejamento', color: '#60a5fa' },
      { name: 'Em Execução', color: '#a78bfa' },
      { name: 'Em Revisão', color: '#fbbf24' },
      { name: 'Homologação', color: '#f472b6' },
      { name: 'Concluído', color: '#22c55e', isFinal: true },
      { name: 'Cancelado', color: '#ef4444', isFinal: true },
    ],
    transitions: [
      { from: 'Backlog', to: 'Planejamento' },
      { from: 'Backlog', to: 'Cancelado' },
      { from: 'Planejamento', to: 'Em Execução' },
      { from: 'Planejamento', to: 'Backlog' },
      { from: 'Em Execução', to: 'Em Revisão' },
      { from: 'Em Revisão', to: 'Em Execução' },
      { from: 'Em Revisão', to: 'Homologação' },
      { from: 'Homologação', to: 'Em Revisão' },
      { from: 'Homologação', to: 'Concluído' },
    ],
  },
  {
    id: 'marketing',
    name: 'Campanhas de Marketing',
    description: 'Gerencie campanhas de marketing do briefing à análise de resultados.',
    icon: Megaphone,
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    category: 'Marketing',
    stages: [
      { name: 'Briefing', color: '#94a3b8', isInitial: true },
      { name: 'Criação', color: '#60a5fa' },
      { name: 'Aprovação', color: '#fbbf24' },
      { name: 'Produção', color: '#a78bfa' },
      { name: 'Ativa', color: '#22c55e' },
      { name: 'Análise', color: '#f472b6' },
      { name: 'Finalizada', color: '#6b7280', isFinal: true },
    ],
    transitions: [
      { from: 'Briefing', to: 'Criação' },
      { from: 'Criação', to: 'Aprovação' },
      { from: 'Aprovação', to: 'Criação' },
      { from: 'Aprovação', to: 'Produção' },
      { from: 'Produção', to: 'Ativa' },
      { from: 'Ativa', to: 'Análise' },
      { from: 'Análise', to: 'Finalizada' },
    ],
  },
  {
    id: 'compliance',
    name: 'Aprovação e Compliance',
    description: 'Fluxo de aprovações com múltiplos níveis para documentos e processos regulatórios.',
    icon: ShieldCheck,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    category: 'Compliance',
    stages: [
      { name: 'Rascunho', color: '#94a3b8', isInitial: true },
      { name: 'Em Revisão', color: '#60a5fa' },
      { name: 'Aprovação N1', color: '#fbbf24' },
      { name: 'Aprovação N2', color: '#f97316' },
      { name: 'Aprovação Final', color: '#a78bfa' },
      { name: 'Aprovado', color: '#22c55e', isFinal: true },
      { name: 'Rejeitado', color: '#ef4444', isFinal: true },
    ],
    transitions: [
      { from: 'Rascunho', to: 'Em Revisão' },
      { from: 'Em Revisão', to: 'Rascunho' },
      { from: 'Em Revisão', to: 'Aprovação N1' },
      { from: 'Aprovação N1', to: 'Em Revisão' },
      { from: 'Aprovação N1', to: 'Aprovação N2' },
      { from: 'Aprovação N1', to: 'Rejeitado' },
      { from: 'Aprovação N2', to: 'Aprovação N1' },
      { from: 'Aprovação N2', to: 'Aprovação Final' },
      { from: 'Aprovação N2', to: 'Rejeitado' },
      { from: 'Aprovação Final', to: 'Aprovação N2' },
      { from: 'Aprovação Final', to: 'Aprovado' },
      { from: 'Aprovação Final', to: 'Rejeitado' },
    ],
  },
];

export function TemplatesPage() {
  const navigate = useNavigate();
  const { organization } = useTenant();
  const [selectedTemplate, setSelectedTemplate] = useState<PipelineTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePreview = (template: PipelineTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
    setSuccess(false);
  };

  const handleUseTemplate = async (template: PipelineTemplate) => {
    if (!organization) return;

    setCreating(true);
    try {
      // Create the pipeline
      const pipeline = await api.createPipeline({
        key: `${template.id}_${Date.now()}`,
        name: `${template.name} (Template)`,
        description: template.description,
      });

      // Create stages
      const stageMap: Record<string, string> = {};
      for (let i = 0; i < template.stages.length; i++) {
        const stage = template.stages[i];
        const createdStage = await api.createStage(pipeline.id, 1, {
          name: stage.name,
          color: stage.color,
          stageOrder: i,
          isInitial: stage.isInitial || false,
          isFinal: stage.isFinal || false,
        });
        stageMap[stage.name] = createdStage.id;
      }

      // Create transitions
      for (const transition of template.transitions) {
        const fromStageId = stageMap[transition.from];
        const toStageId = stageMap[transition.to];
        if (fromStageId && toStageId) {
          await api.createTransition(pipeline.id, 1, {
            fromStageId,
            toStageId,
          });
        }
      }

      setSuccess(true);
      setTimeout(() => {
        setShowPreview(false);
        navigate(`/pipelines/${pipeline.id}/edit`);
      }, 1500);
    } catch (err) {
      console.error('Failed to create pipeline from template:', err);
      alert('Erro ao criar pipeline. Tente novamente.');
    } finally {
      setCreating(false);
    }
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <LayoutTemplate size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">Selecione uma Organização</h2>
          <p className="text-gray-500 mt-2">Escolha um tenant e organização na barra lateral para usar templates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Templates de Pipeline</h1>
        <p className="text-gray-500 mt-1">
          Comece rapidamente com templates pré-configurados para diferentes áreas de negócio
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 group"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${template.iconBg}`}>
                  <template.icon className={template.iconColor} size={24} />
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  {template.category}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{template.description}</p>

              <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  {template.stages.length} estágios
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ArrowRight size={12} />
                  {template.transitions.length} transições
                </span>
              </div>

              {/* Mini stage preview */}
              <div className="flex flex-wrap gap-1 mb-4">
                {template.stages.slice(0, 5).map((stage) => (
                  <span
                    key={stage.name}
                    className="text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: stage.color }}
                  >
                    {stage.name.length > 10 ? stage.name.substring(0, 10) + '...' : stage.name}
                  </span>
                ))}
                {template.stages.length > 5 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                    +{template.stages.length - 5}
                  </span>
                )}
              </div>

              <button
                onClick={() => handlePreview(template)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Copy size={16} />
                Usar Template
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={selectedTemplate?.name || 'Preview'}
        size="lg"
      >
        {selectedTemplate && (
          <div className="space-y-6">
            {success ? (
              <div className="text-center py-8">
                <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Pipeline Criado!</h3>
                <p className="text-gray-500">Redirecionando para o editor...</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${selectedTemplate.iconBg}`}>
                    <selectedTemplate.icon className={selectedTemplate.iconColor} size={28} />
                  </div>
                  <div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 mb-2 inline-block">
                      {selectedTemplate.category}
                    </span>
                    <p className="text-gray-600">{selectedTemplate.description}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Estágios do Pipeline</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.stages.map((stage) => (
                      <div
                        key={stage.name}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        ></div>
                        <span className="text-sm text-gray-700">{stage.name}</span>
                        {stage.isInitial && (
                          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Inicial</span>
                        )}
                        {stage.isFinal && (
                          <span className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">Final</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Fluxo de Transições</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedTemplate.transitions.map((t, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600 truncate">{t.from}</span>
                          <ArrowRight size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="text-gray-600 truncate">{t.to}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="btn-secondary"
                    disabled={creating}
                  >
                    <X size={16} className="mr-2" />
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleUseTemplate(selectedTemplate)}
                    disabled={creating}
                    className="btn-primary"
                  >
                    {creating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Criando...
                      </>
                    ) : (
                      <>
                        <Copy size={16} className="mr-2" />
                        Criar Pipeline
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
