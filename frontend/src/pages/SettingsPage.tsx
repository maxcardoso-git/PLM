import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Key, Link2, CheckCircle2, XCircle, TestTube2, Route, Building2, Hash, FolderKanban, KeyRound, Shield, BookOpen, Zap, FileText, Database, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import {
  HowItWorksModal,
  HowItWorksButton,
  InfoCard,
  FeatureList,
  ExampleBox,
  RulesList,
  type HowItWorksContent,
} from '../components/HowItWorksModal';
import { ExternalAccessSection } from '../components/ExternalAccessSection';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export function SettingsPage() {
  const { t } = useTranslation();
  const { settings, updateExternalFormsConfig, updateExternalProjectsConfig, updateTenantConfig, updateApiKeysServiceConfig, isConfigured, isProjectsConfigured, isTenantConfigured, isApiKeysConfigured } = useSettings();
  // Forms API configuration
  const [baseUrl, setBaseUrl] = useState(settings.externalForms.baseUrl);
  const [listEndpoint, setListEndpoint] = useState(
    settings.externalForms.listEndpoint || '/forms'
  );
  const [schemaEndpoint, setSchemaEndpoint] = useState(
    settings.externalForms.schemaEndpoint || '/forms/{formId}'
  );
  const [dataEndpoint, setDataEndpoint] = useState(
    settings.externalForms.dataEndpoint || '/submissions?formId={formId}'
  );
  const [apiKey, setApiKey] = useState(settings.externalForms.apiKey);
  const [enabled, setEnabled] = useState(settings.externalForms.enabled);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saved, setSaved] = useState(false);

  // Projects API configuration
  const [projectsBaseUrl, setProjectsBaseUrl] = useState(settings.externalProjects.baseUrl);
  const [projectsListEndpoint, setProjectsListEndpoint] = useState(
    settings.externalProjects.listEndpoint || '/projects'
  );
  const [projectsApiKey, setProjectsApiKey] = useState(settings.externalProjects.apiKey);
  const [projectsEnabled, setProjectsEnabled] = useState(settings.externalProjects.enabled);
  const [projectsTestStatus, setProjectsTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [projectsTestMessage, setProjectsTestMessage] = useState('');
  const [projectsSaved, setProjectsSaved] = useState(false);

  // Tenant configuration
  const [tenantId, setTenantId] = useState(settings.tenant.tenantId);
  const [orgId, setOrgId] = useState(settings.tenant.orgId);
  const [tenantSaved, setTenantSaved] = useState(false);

  // API Keys Service configuration
  const [apiKeysBaseUrl, setApiKeysBaseUrl] = useState(settings.apiKeysService.baseUrl);
  const [apiKeysListEndpoint, setApiKeysListEndpoint] = useState(
    settings.apiKeysService.listEndpoint || '/api-keys'
  );
  const [apiKeysApiKey, setApiKeysApiKey] = useState(settings.apiKeysService.apiKey);
  const [apiKeysEnabled, setApiKeysEnabled] = useState(settings.apiKeysService.enabled);
  const [apiKeysTestStatus, setApiKeysTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [apiKeysTestMessage, setApiKeysTestMessage] = useState('');
  const [apiKeysSaved, setApiKeysSaved] = useState(false);

  // How it Works modal state
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Forms preview state
  const [availableForms, setAvailableForms] = useState<any[]>([]);
  const [showFormsPreview, setShowFormsPreview] = useState(false);
  const [testingFormData, setTestingFormData] = useState<string | null>(null);
  const [formDataResult, setFormDataResult] = useState<{ formId: string; data: any; error?: string } | null>(null);

  const howItWorksContent: HowItWorksContent = {
    title: 'Configurações',
    subtitle: 'Configure as integrações externas do PLM',
    sections: [
      {
        id: 'conceito',
        title: 'Conceito',
        icon: <Settings size={20} />,
        content: (
          <div className="space-y-4">
            <InfoCard title="O que são as Configurações?" variant="highlight">
              <p>
                As configurações permitem conectar o PLM a <strong>sistemas externos</strong> que
                fornecem dados para o funcionamento do sistema. Cada seção configura uma integração
                específica com uma API externa.
              </p>
            </InfoCard>

            <InfoCard title="APIs Externas">
              <p>
                O PLM se conecta a serviços externos para buscar formulários, projetos e chaves de API.
                Cada configuração requer uma <strong>URL base</strong>, <strong>endpoint de listagem</strong>
                e uma <strong>chave de autenticação</strong>.
              </p>
            </InfoCard>

            <InfoCard title="Armazenamento Local">
              <p>
                As configurações são salvas no <strong>localStorage</strong> do navegador, o que
                significa que cada usuário pode ter suas próprias configurações e elas persistem
                entre sessões.
              </p>
            </InfoCard>
          </div>
        ),
      },
      {
        id: 'funcionalidades',
        title: 'Funcionalidades',
        icon: <Zap size={20} />,
        content: (
          <div className="space-y-4">
            <FeatureList
              items={[
                { icon: <Link2 size={16} />, text: 'External Forms API - Busca formulários externos para anexar a pipelines' },
                { icon: <FolderKanban size={16} />, text: 'External Projects API - Importa projetos de sistemas externos' },
                { icon: <Building2 size={16} />, text: 'Tenant Configuration - Define tenant e organização padrão' },
                { icon: <KeyRound size={16} />, text: 'API Keys Service - Gerencia chaves para integrações' },
                { icon: <TestTube2 size={16} />, text: 'Teste de conexão antes de salvar configurações' },
                { icon: <CheckCircle2 size={16} />, text: 'Indicadores visuais de status de configuração' },
              ]}
            />

            <InfoCard title="Teste de Conexão">
              <p>
                O botão <strong>"Testar Conexão"</strong> valida se a API externa está acessível
                e retornando dados corretamente. Use sempre antes de salvar para garantir que
                a configuração está funcionando.
              </p>
            </InfoCard>
          </div>
        ),
      },
      {
        id: 'regras',
        title: 'Regras',
        icon: <Shield size={20} />,
        content: (
          <div className="space-y-4">
            <RulesList
              rules={[
                'A URL base não deve terminar com barra "/" - será removida automaticamente',
                'O endpoint deve começar com "/" - será adicionado automaticamente se ausente',
                'A API Key é armazenada de forma segura no localStorage',
                'Teste sempre a conexão antes de salvar para validar credenciais',
                'Configurações desabilitadas não afetam o funcionamento do sistema',
                'O Tenant ID e Organization ID são necessários para operações no backend',
              ]}
            />

            <InfoCard title="Segurança" variant="warning">
              <p>
                As configurações incluem <strong>chaves de API sensíveis</strong>. Evite compartilhar
                seu navegador ou exportar o localStorage sem antes remover essas configurações.
              </p>
            </InfoCard>
          </div>
        ),
      },
      {
        id: 'exemplos',
        title: 'Exemplos',
        icon: <BookOpen size={20} />,
        content: (
          <div className="space-y-4">
            <ExampleBox title="External Forms API">
              <p className="text-sm text-gray-600 mb-2">
                Configuração para buscar formulários de um sistema BIA:
              </p>
              <div className="bg-gray-100 p-3 rounded text-sm space-y-1">
                <div><strong>Base URL:</strong> http://exemplo.com/api/v1</div>
                <div><strong>Endpoint:</strong> /data-entry-forms/external/list</div>
                <div><strong>API Key:</strong> orc_abc123...</div>
              </div>
            </ExampleBox>

            <ExampleBox title="API Keys Service">
              <p className="text-sm text-gray-600 mb-2">
                Configuração para listar chaves de API disponíveis para integrações:
              </p>
              <div className="bg-gray-100 p-3 rounded text-sm space-y-1">
                <div><strong>Base URL:</strong> http://exemplo.com/api/v1</div>
                <div><strong>Endpoint:</strong> /api-keys</div>
                <div><strong>API Key:</strong> orc_def456...</div>
              </div>
            </ExampleBox>

            <ExampleBox title="Tenant Configuration">
              <p className="text-sm text-gray-600 mb-2">
                IDs do tenant e organização para operações multi-tenant:
              </p>
              <div className="bg-gray-100 p-3 rounded text-sm space-y-1">
                <div><strong>Tenant ID:</strong> 766fea59-f15c-4443-bb7d-aec965c1131d</div>
                <div><strong>Organization ID:</strong> Org-1</div>
              </div>
            </ExampleBox>
          </div>
        ),
      },
    ],
  };

  // Forms API handlers
  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    updateExternalFormsConfig({
      baseUrl: baseUrl.replace(/\/$/, ''),
      listEndpoint: listEndpoint.startsWith('/') ? listEndpoint : `/${listEndpoint}`,
      schemaEndpoint: schemaEndpoint.startsWith('/') ? schemaEndpoint : `/${schemaEndpoint}`,
      dataEndpoint: dataEndpoint.startsWith('/') || dataEndpoint.includes('?') ? dataEndpoint : `/${dataEndpoint}`,
      apiKey,
      enabled,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTest = async () => {
    if (!baseUrl || !apiKey) {
      setTestStatus('error');
      setTestMessage(t('settings.connectionFailed'));
      return;
    }

    setTestStatus('testing');
    setTestMessage(t('settings.testing'));
    setAvailableForms([]);
    setShowFormsPreview(false);

    try {
      const endpoint = listEndpoint.startsWith('/') ? listEndpoint : `/${listEndpoint}`;
      const response = await fetch(`${API_BASE_URL}/external-forms/proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: baseUrl.replace(/\/$/, ''),
          endpoint,
          apiKey,
          method: 'GET',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const forms = data.data || data.items || data;
        const formsList = Array.isArray(forms) ? forms : [];
        setAvailableForms(formsList);
        setTestStatus('success');
        setTestMessage(`${t('settings.connectionSuccess')} (${formsList.length} forms)`);
        if (formsList.length > 0) {
          setShowFormsPreview(true);
        }
      } else {
        setTestStatus('error');
        setTestMessage(t('settings.connectionFailed'));
      }
    } catch {
      setTestStatus('error');
      setTestMessage(t('settings.connectionFailed'));
    }
  };

  const handleTestFormData = async (formId: string) => {
    if (!baseUrl || !apiKey) return;

    setTestingFormData(formId);
    setFormDataResult(null);

    try {
      // Build the data endpoint URL
      const dataEndpointTemplate = dataEndpoint || '/data-entry-forms/external/{formId}/submissions/lookup';
      const formDataEndpoint = dataEndpointTemplate.replace('{formId}', formId);
      // Use & if endpoint already has query params, otherwise use ?
      const separator = formDataEndpoint.includes('?') ? '&' : '?';

      // Test with a sample lookup (just to verify the endpoint works)
      const response = await fetch(`${API_BASE_URL}/external-forms/proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: baseUrl.replace(/\/$/, ''),
          endpoint: `${formDataEndpoint}${separator}keyField=test&keyValue=test`,
          apiKey,
          method: 'GET',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setFormDataResult({
          formId,
          data: result,
        });
      } else {
        setFormDataResult({
          formId,
          data: null,
          error: result.message || 'Endpoint nao encontrado ou erro na API',
        });
      }
    } catch (err) {
      setFormDataResult({
        formId,
        data: null,
        error: 'Falha ao conectar com o endpoint de dados',
      });
    } finally {
      setTestingFormData(null);
    }
  };

  // Projects API handlers
  const handleProjectsSave = (e: FormEvent) => {
    e.preventDefault();
    updateExternalProjectsConfig({
      baseUrl: projectsBaseUrl.replace(/\/$/, ''),
      listEndpoint: projectsListEndpoint.startsWith('/') ? projectsListEndpoint : `/${projectsListEndpoint}`,
      apiKey: projectsApiKey,
      enabled: projectsEnabled,
    });
    setProjectsSaved(true);
    setTimeout(() => setProjectsSaved(false), 3000);
  };

  const handleProjectsTest = async () => {
    if (!projectsBaseUrl || !projectsApiKey) {
      setProjectsTestStatus('error');
      setProjectsTestMessage(t('settings.connectionFailed'));
      return;
    }

    setProjectsTestStatus('testing');
    setProjectsTestMessage(t('settings.testing'));

    try {
      const endpoint = projectsListEndpoint.startsWith('/') ? projectsListEndpoint : `/${projectsListEndpoint}`;
      const response = await fetch(`${API_BASE_URL}/external-forms/proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: projectsBaseUrl.replace(/\/$/, ''),
          endpoint,
          apiKey: projectsApiKey,
          method: 'GET',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const projects = data.data || data.items || data;
        const count = Array.isArray(projects) ? projects.length : 0;
        setProjectsTestStatus('success');
        setProjectsTestMessage(`${t('settings.connectionSuccess')} (${count} projects)`);
      } else {
        setProjectsTestStatus('error');
        setProjectsTestMessage(t('settings.connectionFailed'));
      }
    } catch {
      setProjectsTestStatus('error');
      setProjectsTestMessage(t('settings.connectionFailed'));
    }
  };

  // API Keys Service handlers
  const handleApiKeysSave = (e: FormEvent) => {
    e.preventDefault();
    updateApiKeysServiceConfig({
      baseUrl: apiKeysBaseUrl.replace(/\/$/, ''),
      listEndpoint: apiKeysListEndpoint.startsWith('/') ? apiKeysListEndpoint : `/${apiKeysListEndpoint}`,
      apiKey: apiKeysApiKey,
      enabled: apiKeysEnabled,
    });
    setApiKeysSaved(true);
    setTimeout(() => setApiKeysSaved(false), 3000);
  };

  const handleApiKeysTest = async () => {
    if (!apiKeysBaseUrl || !apiKeysApiKey) {
      setApiKeysTestStatus('error');
      setApiKeysTestMessage(t('settings.connectionFailed'));
      return;
    }

    setApiKeysTestStatus('testing');
    setApiKeysTestMessage(t('settings.testing'));

    try {
      const endpoint = apiKeysListEndpoint.startsWith('/') ? apiKeysListEndpoint : `/${apiKeysListEndpoint}`;
      const response = await fetch(`${API_BASE_URL}/external-forms/proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: apiKeysBaseUrl.replace(/\/$/, ''),
          endpoint,
          apiKey: apiKeysApiKey,
          method: 'GET',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const keys = data.data || data.items || data;
        const count = Array.isArray(keys) ? keys.length : 0;
        setApiKeysTestStatus('success');
        setApiKeysTestMessage(`${t('settings.connectionSuccess')} (${count} API keys)`);
      } else {
        setApiKeysTestStatus('error');
        setApiKeysTestMessage(t('settings.connectionFailed'));
      }
    } catch {
      setApiKeysTestStatus('error');
      setApiKeysTestMessage(t('settings.connectionFailed'));
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-gray-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
          <p className="text-sm text-gray-500">{t('settings.subtitle')}</p>
        </div>
        <HowItWorksButton onClick={() => setShowHowItWorks(true)} />
      </div>

      {/* External Forms API Configuration */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Link2 className="text-blue-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('settings.externalFormsApi')}</h2>
                <p className="text-sm text-gray-500">{t('settings.externalFormsDesc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConfigured ? (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 size={16} />
                  {t('settings.connected')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <XCircle size={16} />
                  {t('settings.notConfigured')}
                </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.baseUrl')}
            </label>
            <div className="relative">
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://72.61.52.70:3080/api/v1"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.listEndpoint')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={listEndpoint}
                onChange={(e) => setListEndpoint(e.target.value)}
                placeholder="/forms"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Route className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <p className="mt-1 text-xs text-gray-500">Endpoint para listar formulários disponíveis</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint de Schema
            </label>
            <div className="relative">
              <input
                type="text"
                value={schemaEndpoint}
                onChange={(e) => setSchemaEndpoint(e.target.value)}
                placeholder="/forms/{formId}"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Route className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <p className="mt-1 text-xs text-gray-500">Endpoint para obter schema/estrutura do formulário. Use {'{formId}'} como placeholder</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint de Dados
            </label>
            <div className="relative">
              <input
                type="text"
                value={dataEndpoint}
                onChange={(e) => setDataEndpoint(e.target.value)}
                placeholder="/submissions?formId={formId}"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Route className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <p className="mt-1 text-xs text-gray-500">Endpoint para buscar dados. Use {'{formId}'} como placeholder (ex: &keyField=cpf&keyValue=123)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.apiKey')}
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="orc_abf9cb8d..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">{t('settings.enableIntegration')}</span>
          </div>

          {testStatus !== 'idle' && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                testStatus === 'testing'
                  ? 'bg-blue-50 text-blue-700'
                  : testStatus === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {testStatus === 'testing' && (
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              )}
              {testStatus === 'success' && <CheckCircle2 size={16} />}
              {testStatus === 'error' && <XCircle size={16} />}
              {testMessage}
            </div>
          )}

          {saved && (
            <div className="p-3 rounded-lg text-sm bg-green-50 text-green-700 flex items-center gap-2">
              <CheckCircle2 size={16} />
              {t('settings.settingsSaved')}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleTest}
              disabled={testStatus === 'testing'}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <TestTube2 size={16} />
              {t('settings.testConnection')}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              {t('settings.saveSettings')}
            </button>
          </div>

          {/* Forms Preview Section */}
          {availableForms.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowFormsPreview(!showFormsPreview)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {showFormsPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <FileText size={16} />
                Formularios Disponiveis ({availableForms.length})
              </button>

              {showFormsPreview && (
                <div className="mt-4 space-y-3">
                  {availableForms.map((form: any) => (
                    <div key={form.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{form.name || form.title}</h4>
                          {form.description && (
                            <p className="text-sm text-gray-500 mt-1">{form.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              ID: {form.id}
                            </span>
                            {form.uniqueKeyField && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                Chave Unica: {form.uniqueKeyField}
                              </span>
                            )}
                            {form.fields && (
                              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                {form.fields.length} campos
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTestFormData(form.id)}
                          disabled={testingFormData === form.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200 disabled:opacity-50"
                        >
                          {testingFormData === form.id ? (
                            <>
                              <div className="animate-spin h-3 w-3 border-2 border-purple-500 border-t-transparent rounded-full" />
                              Testando...
                            </>
                          ) : (
                            <>
                              <Database size={14} />
                              Testar Dados
                            </>
                          )}
                        </button>
                      </div>

                      {/* Form Data Test Result */}
                      {formDataResult && formDataResult.formId === form.id && (
                        <div className={`mt-3 p-3 rounded text-sm ${formDataResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                          {formDataResult.error ? (
                            <div className="flex items-center gap-2">
                              <AlertCircle size={16} />
                              {formDataResult.error}
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 size={16} />
                                Endpoint de dados funcionando!
                              </div>
                              <code className="block p-2 bg-white rounded text-xs text-gray-600 overflow-x-auto">
                                {dataEndpoint.replace('{formId}', form.id)}
                              </code>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* External Projects API Configuration */}
      <div className="mt-6 bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FolderKanban className="text-green-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('settings.externalProjectsApi')}</h2>
                <p className="text-sm text-gray-500">{t('settings.externalProjectsDesc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isProjectsConfigured ? (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 size={16} />
                  {t('settings.connected')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <XCircle size={16} />
                  {t('settings.notConfigured')}
                </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleProjectsSave} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.baseUrl')}
            </label>
            <div className="relative">
              <input
                type="url"
                value={projectsBaseUrl}
                onChange={(e) => setProjectsBaseUrl(e.target.value)}
                placeholder="http://72.61.52.70:3080/api/v1"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.listEndpoint')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={projectsListEndpoint}
                onChange={(e) => setProjectsListEndpoint(e.target.value)}
                placeholder="/projects"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <Route className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.apiKey')}
            </label>
            <div className="relative">
              <input
                type="password"
                value={projectsApiKey}
                onChange={(e) => setProjectsApiKey(e.target.value)}
                placeholder="orc_abf9cb8d..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={projectsEnabled}
                onChange={(e) => setProjectsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">{t('settings.enableIntegration')}</span>
          </div>

          {projectsTestStatus !== 'idle' && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                projectsTestStatus === 'testing'
                  ? 'bg-green-50 text-green-700'
                  : projectsTestStatus === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {projectsTestStatus === 'testing' && (
                <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full" />
              )}
              {projectsTestStatus === 'success' && <CheckCircle2 size={16} />}
              {projectsTestStatus === 'error' && <XCircle size={16} />}
              {projectsTestMessage}
            </div>
          )}

          {projectsSaved && (
            <div className="p-3 rounded-lg text-sm bg-green-50 text-green-700 flex items-center gap-2">
              <CheckCircle2 size={16} />
              {t('settings.settingsSaved')}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleProjectsTest}
              disabled={projectsTestStatus === 'testing'}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <TestTube2 size={16} />
              {t('settings.testConnection')}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              {t('settings.saveSettings')}
            </button>
          </div>
        </form>
      </div>

      {/* Tenant Configuration */}
      <div className="mt-6 bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="text-purple-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('settings.tenantConfig')}</h2>
                <p className="text-sm text-gray-500">{t('settings.tenantConfigDesc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isTenantConfigured ? (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 size={16} />
                  {t('settings.connected')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <XCircle size={16} />
                  {t('settings.notConfigured')}
                </span>
              )}
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateTenantConfig({ tenantId, orgId });
            setTenantSaved(true);
            setTimeout(() => setTenantSaved(false), 3000);
            window.dispatchEvent(new CustomEvent('plm:tenant-updated', {
              detail: { tenantId, orgId }
            }));
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.tenantId')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="766fea59-f15c-4443-bb7d-aec965c1131d"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
              />
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.organizationId')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="Org-1"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          {tenantSaved && (
            <div className="p-3 rounded-lg text-sm bg-green-50 text-green-700 flex items-center gap-2">
              <CheckCircle2 size={16} />
              {t('settings.settingsSaved')}
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              {t('settings.saveSettings')}
            </button>
          </div>
        </form>
      </div>

      {/* API Keys Service Configuration */}
      <div className="mt-6 bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <KeyRound className="text-orange-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('settings.apiKeysService')}</h2>
                <p className="text-sm text-gray-500">{t('settings.apiKeysServiceDesc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isApiKeysConfigured ? (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 size={16} />
                  {t('settings.connected')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <XCircle size={16} />
                  {t('settings.notConfigured')}
                </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleApiKeysSave} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.baseUrl')}
            </label>
            <div className="relative">
              <input
                type="url"
                value={apiKeysBaseUrl}
                onChange={(e) => setApiKeysBaseUrl(e.target.value)}
                placeholder="http://72.61.52.70:3080/api/v1"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.listEndpoint')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={apiKeysListEndpoint}
                onChange={(e) => setApiKeysListEndpoint(e.target.value)}
                placeholder="/api-keys"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <Route className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.apiKey')}
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKeysApiKey}
                onChange={(e) => setApiKeysApiKey(e.target.value)}
                placeholder="orc_abf9cb8d..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={apiKeysEnabled}
                onChange={(e) => setApiKeysEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">{t('settings.enableIntegration')}</span>
          </div>

          {apiKeysTestStatus !== 'idle' && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                apiKeysTestStatus === 'testing'
                  ? 'bg-orange-50 text-orange-700'
                  : apiKeysTestStatus === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {apiKeysTestStatus === 'testing' && (
                <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full" />
              )}
              {apiKeysTestStatus === 'success' && <CheckCircle2 size={16} />}
              {apiKeysTestStatus === 'error' && <XCircle size={16} />}
              {apiKeysTestMessage}
            </div>
          )}

          {apiKeysSaved && (
            <div className="p-3 rounded-lg text-sm bg-green-50 text-green-700 flex items-center gap-2">
              <CheckCircle2 size={16} />
              {t('settings.settingsSaved')}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleApiKeysTest}
              disabled={apiKeysTestStatus === 'testing'}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <TestTube2 size={16} />
              {t('settings.testConnection')}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
            >
              {t('settings.saveSettings')}
            </button>
          </div>
        </form>
      </div>

      {/* External Access Section */}
      <ExternalAccessSection />

      {/* How it Works Modal */}
      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
        content={howItWorksContent}
      />
    </div>
  );
}
