import { useState, useEffect } from 'react';
import { FileText, AlertCircle, RefreshCw, Eye, FolderOpen, Settings, ExternalLink, Loader2, Lightbulb, Target, BookOpen, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { Modal } from '../components/ui';
import {
  HowItWorksModal,
  HowItWorksButton,
  InfoCard,
  FeatureList,
  ExampleBox,
  RulesList,
  type HowItWorksContent,
} from '../components/HowItWorksModal';

interface FormDefinition {
  id: string;
  name: string;
  description?: string;
  status: string;
  biaStatus?: string;
  version?: string;
  projectId?: string;
  projectName?: string;
  project?: {
    id: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface FormFieldOption {
  label: string;
  value: string;
}

interface FormField {
  id?: string;
  name?: string;
  type: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
  // Options can be strings OR objects with label/value
  options?: (string | FormFieldOption)[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  helpText?: string;
  defaultValue?: string | number | boolean;
}

// Helper to get field identifier (id or name)
const getFieldId = (field: FormField): string => field.id || field.name || '';

// Helper to normalize options to {label, value} format
const normalizeOptions = (options?: (string | FormFieldOption)[]): FormFieldOption[] => {
  if (!options) return [];
  return options.map(opt => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt };
    }
    return opt;
  });
};

interface FormSchema {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
}

interface FormsByProject {
  projectId: string;
  projectName: string;
  forms: FormDefinition[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export function FormsPage() {
  const { settings, isConfigured } = useSettings();
  const [formsByProject, setFormsByProject] = useState<FormsByProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Form preview state
  const [selectedForm, setSelectedForm] = useState<FormDefinition | null>(null);
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{ total: number; filtered: number } | null>(null);

  const howItWorksContent: HowItWorksContent = {
    title: 'Formulários',
    subtitle: 'Gerencie e visualize formulários externos',
    sections: [
      {
        id: 'concept',
        title: 'Conceito',
        icon: <Lightbulb size={18} />,
        content: (
          <div className="space-y-4">
            <p>
              <strong>Formulários</strong> são estruturas de dados que capturam informações durante o
              processamento de cards nos pipelines. Eles são gerenciados por uma API externa e
              podem ser anexados a stages para coleta de dados.
            </p>
            <InfoCard title="Configuração em Settings" variant="warning">
              <strong>IMPORTANTE:</strong> Esta página exibe formulários da <strong>API Externa de Formulários</strong>,
              configurada em <strong>Settings &gt; External Forms API</strong>.
              <br /><br />
              <strong>NÃO confunda com Integrations!</strong> A página de Integrações gerencia webhooks e triggers.
              Os formulários são obtidos através de uma API separada (ex: GCP Forms).
            </InfoCard>
            <p>
              Os formulários são organizados por <strong>Projeto</strong>, facilitando a identificação
              de quais formulários pertencem a cada área ou contexto de negócio.
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
            <p>Na tela de Formulários você pode:</p>
            <FeatureList
              items={[
                { text: 'Visualizar todos os formulários publicados e aprovados' },
                { text: 'Agrupar formulários por projeto para melhor organização' },
                { text: 'Simular o preenchimento de formulários antes de anexá-los' },
                { text: 'Verificar os campos, tipos e validações de cada formulário' },
                { text: 'Acessar a API externa para gerenciar os formulários' },
              ]}
            />
            <InfoCard title="Simulação" variant="info">
              O botão "Simular" permite testar o preenchimento do formulário sem salvar dados.
              É útil para verificar se o formulário está configurado corretamente.
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
            <p>Regras importantes sobre Formulários:</p>
            <RulesList
              rules={[
                'Apenas formulários com status "Published" E biaStatus "Approved" são exibidos',
                'A criação e edição de formulários é feita na API externa (ex: GCP Forms)',
                'Para usar formulários, configure a API em Settings > External Forms API',
                'Formulários podem ser anexados a stages do pipeline no Editor de Pipeline',
                'Cada stage pode ter múltiplos formulários anexados',
                'O preenchimento real ocorre no Kanban, ao abrir um card',
              ]}
            />
            <InfoCard title="Não vê formulários?" variant="info">
              Se a API está configurada mas nenhum formulário aparece, verifique:
              <br />• Se os formulários na API externa têm status = "Published"
              <br />• Se os formulários têm BIA Status = "Approved"
              <br />• Se a API Key tem permissão para listar formulários externos
            </InfoCard>
          </div>
        ),
      },
      {
        id: 'examples',
        title: 'Exemplos',
        icon: <Target size={18} />,
        content: (
          <div className="space-y-4">
            <p>Exemplos de uso de Formulários:</p>
            <ExampleBox title="Cadastro de Cliente">
              Crie um formulário com campos como Nome, CPF/CNPJ, Telefone, Email e Endereço.
              Anexe-o ao stage "Cadastro" do pipeline de vendas para capturar os dados do cliente.
            </ExampleBox>
            <ExampleBox title="Checklist de Qualidade">
              Configure um formulário com campos do tipo checkbox para verificação de itens.
              Anexe ao stage "Inspeção" para garantir que todos os critérios foram verificados.
            </ExampleBox>
            <ExampleBox title="Feedback do Cliente">
              Use campos de rating e textarea para capturar avaliações.
              Anexe ao stage "Concluído" para coletar feedback após a finalização do processo.
            </ExampleBox>
          </div>
        ),
      },
    ],
  };

  const fetchForms = async () => {
    if (!isConfigured) return;

    setLoading(true);
    setError(null);

    try {
      const { baseUrl, listEndpoint, apiKey } = settings.externalForms;
      const response = await fetch(`${API_BASE_URL}/external-forms/proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl,
          endpoint: listEndpoint,
          apiKey,
          method: 'GET',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch forms: ${response.status}`);
      }

      const data = await response.json();
      console.log('Forms API raw response:', data);

      let allForms: FormDefinition[] = [];
      if (Array.isArray(data)) {
        allForms = data;
      } else if (data && Array.isArray(data.items)) {
        allForms = data.items;
      } else if (data && Array.isArray(data.data)) {
        allForms = data.data;
      } else if (data && data.success && Array.isArray(data.data)) {
        allForms = data.data;
      }

      console.log('All forms before filter:', allForms.length, allForms.map(f => ({
        name: f.name,
        status: f.status,
        biaStatus: (f as any).biaStatus || (f as any).BIAStatus || (f as any).bia_status,
        keys: Object.keys(f)
      })));

      // Filter only Published AND Approved (BIA) forms
      // Check multiple possible field names for biaStatus
      const forms = allForms.filter(form => {
        const formAny = form as any;
        const isPublished = form.status?.toLowerCase() === 'published';
        const biaValue = formAny.biaStatus || formAny.BIAStatus || formAny.bia_status || formAny.biastatus;
        const isApproved = biaValue?.toLowerCase() === 'approved';
        console.log(`Form "${form.name}": status=${form.status}, biaStatus=${biaValue}, passes=${isPublished && isApproved}`);
        return isPublished && isApproved;
      });

      // Save debug info
      setDebugInfo({ total: allForms.length, filtered: forms.length });

      // Debug: log first form to see structure
      if (forms.length > 0) {
        console.log('Form structure:', JSON.stringify(forms[0], null, 2));
      }

      const grouped = forms.reduce((acc: Record<string, FormsByProject>, form) => {
        // Get project info from various possible field names
        const formAny = form as any;
        const projectId = form.project?.id || form.projectId || formAny.project_id || 'no-project';
        const projectName = form.project?.name || form.projectName || formAny.project_name || formAny.Project || 'Sem Projeto';

        if (!acc[projectId]) {
          acc[projectId] = {
            projectId,
            projectName,
            forms: [],
          };
        }
        acc[projectId].forms.push(form);
        return acc;
      }, {});

      const sortedProjects = Object.values(grouped).sort((a, b) =>
        a.projectName.localeCompare(b.projectName)
      );

      setFormsByProject(sortedProjects);
      setExpandedProjects(new Set(sortedProjects.map(p => p.projectId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch forms');
      setDebugInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormSchema = async (form: FormDefinition) => {
    setSelectedForm(form);
    setLoadingSchema(true);
    setSchemaError(null);
    setFormSchema(null);
    setFormValues({});

    try {
      const { baseUrl, apiKey } = settings.externalForms;
      const response = await fetch(`${API_BASE_URL}/external-forms/proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl,
          endpoint: `/data-entry-forms/${form.id}/schema`,
          apiKey,
          method: 'GET',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch form schema: ${response.status}`);
      }

      const data = await response.json();
      // Handle different response formats
      const schema = data.data || data;
      setFormSchema(schema);

      // Initialize form values with defaults
      const initialValues: Record<string, any> = {};
      if (schema.fields) {
        schema.fields.forEach((field: FormField) => {
          const fieldId = getFieldId(field);
          if (field.defaultValue !== undefined) {
            initialValues[fieldId] = field.defaultValue;
          } else if (field.type === 'boolean' || field.type === 'checkbox') {
            initialValues[fieldId] = false;
          } else {
            initialValues[fieldId] = '';
          }
        });
      }
      setFormValues(initialValues);
    } catch (err) {
      setSchemaError(err instanceof Error ? err.message : 'Failed to fetch form schema');
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const closePreview = () => {
    setSelectedForm(null);
    setFormSchema(null);
    setSchemaError(null);
    setFormValues({});
  };

  useEffect(() => {
    if (isConfigured) {
      fetchForms();
    }
  }, [isConfigured]);

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

  const renderField = (field: FormField) => {
    const fieldId = getFieldId(field);
    const value = formValues[fieldId] ?? '';
    const baseInputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
    // Get validation constraints from either flat properties or nested validation object
    const minVal = field.min ?? field.validation?.min;
    const maxVal = field.max ?? field.validation?.max;
    const minLength = field.minLength ?? field.validation?.minLength;
    const maxLength = field.maxLength ?? field.validation?.maxLength;
    const pattern = field.pattern ?? field.validation?.pattern;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
            minLength={minLength}
            maxLength={maxLength}
            pattern={pattern}
          />
        );

      case 'number':
      case 'rating':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
            min={minVal}
            max={maxVal}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            className={baseInputClass}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            className={baseInputClass}
          />
        );

      case 'time':
        return (
          <input
            type="time"
            value={value}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            className={baseInputClass}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
            rows={4}
            minLength={minLength}
            maxLength={maxLength}
          />
        );

      case 'select': {
        const options = normalizeOptions(field.options);
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            className={baseInputClass}
          >
            <option value="">Selecione...</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }

      case 'radio': {
        const options = normalizeOptions(field.options);
        return (
          <div className="space-y-2">
            {options.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={fieldId}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        );
      }

      case 'checkbox': {
        // Checkbox with options (multiple selection)
        if (field.options && field.options.length > 0) {
          const options = normalizeOptions(field.options);
          return (
            <div className="space-y-2">
              {options.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={opt.value}
                    checked={Array.isArray(value) ? value.includes(opt.value) : false}
                    onChange={(e) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      if (e.target.checked) {
                        handleFieldChange(fieldId, [...currentValues, opt.value]);
                      } else {
                        handleFieldChange(fieldId, currentValues.filter((v: string) => v !== opt.value));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          );
        }
        // Single checkbox (boolean-like)
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleFieldChange(fieldId, e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Sim</span>
          </label>
        );
      }

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleFieldChange(fieldId, e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Sim</span>
          </label>
        );

      case 'file':
        return (
          <input
            type="file"
            onChange={(e) => handleFieldChange(fieldId, e.target.files?.[0]?.name || '')}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        );
    }
  };

  const totalForms = formsByProject.reduce((sum, p) => sum + p.forms.length, 0);

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <Settings size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">API de Formulários não configurada</h2>
          <p className="text-gray-500 mt-2">
            Configure a API externa de formulários nas configurações para visualizar os formulários disponíveis.
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Settings size={16} />
            Ir para Configurações
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
        content={howItWorksContent}
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="text-gray-400" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Formulários</h1>
            <p className="text-sm text-gray-500">
              {totalForms} formulário{totalForms !== 1 ? 's' : ''} em {formsByProject.length} projeto{formsByProject.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <HowItWorksButton onClick={() => setShowHowItWorks(true)} />
          <button
            onClick={fetchForms}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <a
            href={settings.externalForms.baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <ExternalLink size={16} />
            Abrir API
          </a>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : formsByProject.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <FileText className="mx-auto mb-3 text-gray-300" size={48} />
          <h2 className="text-lg font-medium text-gray-600">Nenhum formulário encontrado</h2>
          <p className="text-gray-500 mt-1">
            Os formulários são criados e gerenciados na API externa.
          </p>
          {debugInfo && debugInfo.total > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm inline-block text-left">
              <p className="font-medium">Diagnóstico:</p>
              <p>• API retornou {debugInfo.total} formulário(s)</p>
              <p>• {debugInfo.total - debugInfo.filtered} foram filtrados (não têm status="Published" E biaStatus="Approved")</p>
              <p className="mt-2 text-xs text-amber-600">
                Verifique o Console do navegador (F12) para detalhes dos formulários filtrados.
              </p>
            </div>
          )}
          {debugInfo && debugInfo.total === 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm inline-block text-left">
              <p className="font-medium">Diagnóstico:</p>
              <p>• A API externa não retornou nenhum formulário</p>
              <p className="mt-2 text-xs text-blue-600">
                Verifique se existem formulários na API externa e se a API Key tem permissão.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {formsByProject.map((project) => (
            <div
              key={project.projectId}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Project Header */}
              <button
                onClick={() => toggleProject(project.projectId)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <FolderOpen className="text-purple-600" size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">{project.projectName}</h3>
                    <p className="text-sm text-gray-500">
                      {project.forms.length} formulário{project.forms.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedProjects.has(project.projectId) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Forms List */}
              {expandedProjects.has(project.projectId) && (
                <div className="border-t border-gray-200">
                  {project.forms.map((form, index) => (
                    <div
                      key={form.id}
                      className={`flex items-center justify-between p-4 hover:bg-gray-50 ${
                        index > 0 ? 'border-t border-gray-100' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileText className="text-blue-600" size={18} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{form.name}</h4>
                          {form.description && (
                            <p className="text-sm text-gray-500 mt-0.5">{form.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            {form.version && <span>{form.version.startsWith('v') ? form.version : `v${form.version}`}</span>}
                            <span className="font-mono">{form.id}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                            form.status?.toLowerCase() === 'published' || form.status?.toLowerCase() === 'active'
                              ? 'bg-green-100 text-green-700'
                              : form.status?.toLowerCase() === 'draft'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {form.status?.toUpperCase()}
                        </span>
                        <button
                          onClick={() => fetchFormSchema(form)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium"
                          title="Visualizar formulário"
                        >
                          <Eye size={16} />
                          Simular
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Preview Modal */}
      <Modal
        isOpen={!!selectedForm}
        onClose={closePreview}
        title={selectedForm?.name || 'Visualizar Formulário'}
        size="2xl"
      >
        <div className="max-h-[70vh] overflow-y-auto">
          {loadingSchema ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <p className="text-gray-500 mt-3">Carregando formulário...</p>
            </div>
          ) : schemaError ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                {schemaError}
              </div>
            </div>
          ) : formSchema ? (
            <div className="space-y-6">
              {formSchema.description && (
                <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                  {formSchema.description}
                </p>
              )}

              {formSchema.fields && formSchema.fields.length > 0 ? (
                <div className="space-y-5">
                  {formSchema.fields.map((field) => (
                    <div key={getFieldId(field)}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderField(field)}
                      {(field.helpText || field.description) && (
                        <p className="text-xs text-gray-500 mt-1">{field.helpText || field.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Este formulário não possui campos definidos.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={closePreview}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    console.log('Form values:', formValues);
                    alert('Dados do formulário (simulação):\n\n' + JSON.stringify(formValues, null, 2));
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Testar Envio
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
