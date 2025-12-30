import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Zap,
  Plus,
  Edit2,
  Trash2,
  TestTube2,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Settings,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useTenant } from '../context/TenantContext';
import type { Integration, ExternalApiKey } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export function IntegrationsPage() {
  const { t } = useTranslation();
  const { settings, isApiKeysConfigured } = useSettings();
  const { organization } = useTenant();

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [testingIntegration, setTestingIntegration] = useState<Integration | null>(null);
  const [deletingIntegration, setDeletingIntegration] = useState<Integration | null>(null);

  // Form state
  const [formKey, setFormKey] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formApiKeyId, setFormApiKeyId] = useState('');
  const [formApiKeyName, setFormApiKeyName] = useState('');
  const [formHttpMethod, setFormHttpMethod] = useState<string>('POST');
  const [formEndpoint, setFormEndpoint] = useState('');
  const [formDefaultPayload, setFormDefaultPayload] = useState('{}');
  const [formSaving, setFormSaving] = useState(false);

  // API Keys from external service
  const [apiKeys, setApiKeys] = useState<ExternalApiKey[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);

  // Test state
  const [testPayload, setTestPayload] = useState('{}');
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string; response?: any }>({
    status: 'idle',
    message: '',
  });

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string; details?: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string, details?: string) => {
    setToast({ type, message, details });
    setTimeout(() => setToast(null), 6000);
  };

  // Fetch integrations
  useEffect(() => {
    if (organization) {
      fetchIntegrations();
    }
  }, [organization]);

  const fetchIntegrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getIntegrations();
      setIntegrations(response.items || []);
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
      setError(t('integrations.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch API Keys from external service
  const fetchApiKeys = async () => {
    if (!isApiKeysConfigured) return;

    setLoadingApiKeys(true);
    try {
      const endpoint = settings.apiKeysService.listEndpoint.startsWith('/')
        ? settings.apiKeysService.listEndpoint
        : `/${settings.apiKeysService.listEndpoint}`;

      const response = await fetch(`${API_BASE_URL}/external-forms/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: settings.apiKeysService.baseUrl,
          endpoint,
          apiKey: settings.apiKeysService.apiKey,
          method: 'GET',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const keys = data.data || data.items || data;
        setApiKeys(Array.isArray(keys) ? keys : []);
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    } finally {
      setLoadingApiKeys(false);
    }
  };

  // Open create modal
  const openCreateModal = () => {
    setEditingIntegration(null);
    setFormKey('');
    setFormName('');
    setFormDescription('');
    setFormApiKeyId('');
    setFormApiKeyName('');
    setFormHttpMethod('POST');
    setFormEndpoint('');
    setFormDefaultPayload('{}');
    setShowCreateModal(true);
    fetchApiKeys();
  };

  // Open edit modal
  const openEditModal = (integration: Integration) => {
    setEditingIntegration(integration);
    setFormKey(integration.key);
    setFormName(integration.name);
    setFormDescription(integration.description || '');
    setFormApiKeyId(integration.externalApiKeyId);
    setFormApiKeyName(integration.externalApiKeyName || '');
    setFormHttpMethod(integration.httpMethod);
    setFormEndpoint(integration.endpoint || '');
    setFormDefaultPayload(JSON.stringify(integration.defaultPayload || {}, null, 2));
    setShowCreateModal(true);
    fetchApiKeys();
  };

  // Save integration
  const handleSave = async () => {
    let payload: Record<string, any>;
    try {
      payload = JSON.parse(formDefaultPayload);
    } catch {
      payload = {};
    }

    setFormSaving(true);
    try {
      if (editingIntegration) {
        await api.updateIntegration(editingIntegration.id, {
          name: formName,
          description: formDescription || undefined,
          httpMethod: formHttpMethod,
          endpoint: formEndpoint || undefined,
          defaultPayload: payload,
        });
      } else {
        await api.createIntegration({
          key: formKey,
          name: formName,
          description: formDescription || undefined,
          externalApiKeyId: formApiKeyId,
          externalApiKeyName: formApiKeyName || undefined,
          httpMethod: formHttpMethod,
          endpoint: formEndpoint || undefined,
          defaultPayload: payload,
        });
      }
      setShowCreateModal(false);
      fetchIntegrations();
    } catch (err) {
      console.error('Failed to save integration:', err);
    } finally {
      setFormSaving(false);
    }
  };

  // Delete integration
  const handleDelete = async () => {
    if (!deletingIntegration) return;

    try {
      await api.deleteIntegration(deletingIntegration.id);
      setShowDeleteModal(false);
      setDeletingIntegration(null);
      fetchIntegrations();
      showToast('success', 'Integração excluída com sucesso!');
    } catch (err: any) {
      console.error('Failed to delete integration:', err);
      setShowDeleteModal(false);

      // Check if it's the INTEGRATION_IN_USE error
      const errorData = err.response?.data;
      if (errorData?.code === 'INTEGRATION_IN_USE') {
        const usages = errorData.details?.usages || [];
        const usageList = usages
          .slice(0, 3) // Show max 3 usages
          .map((u: any) => `• ${u.pipeline} (v${u.version}) - ${u.stage}`)
          .join('\n');
        const moreCount = usages.length > 3 ? `\n... e mais ${usages.length - 3} local(is)` : '';

        showToast(
          'error',
          errorData.message || 'Não é possível excluir esta integração',
          usageList + moreCount
        );
      } else {
        showToast('error', 'Falha ao excluir integração');
      }
    }
  };

  // Open test modal
  const openTestModal = (integration: Integration) => {
    setTestingIntegration(integration);
    setTestPayload(JSON.stringify(integration.defaultPayload || {}, null, 2));
    setTestResult({ status: 'idle', message: '' });
    setShowTestModal(true);
  };

  // Run test
  const handleTest = async () => {
    if (!testingIntegration) return;

    let payload: Record<string, any>;
    try {
      payload = JSON.parse(testPayload);
    } catch {
      setTestResult({ status: 'error', message: t('integrations.invalidJson') });
      return;
    }

    setTestResult({ status: 'testing', message: t('settings.testing') });

    try {
      const testConfig = await api.testIntegration(testingIntegration.id, payload);

      // Use proxy to make the actual test call
      const response = await fetch(`${API_BASE_URL}/external-forms/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: settings.apiKeysService.baseUrl,
          endpoint: testConfig.integration.endpoint || '',
          apiKey: settings.apiKeysService.apiKey,
          method: testConfig.integration.httpMethod,
          body: testConfig.testPayload,
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        setTestResult({
          status: 'success',
          message: t('integrations.testSuccess'),
          response: responseData,
        });
      } else {
        setTestResult({
          status: 'error',
          message: t('integrations.testFailed'),
          response: responseData,
        });
      }
    } catch (err) {
      console.error('Test failed:', err);
      setTestResult({
        status: 'error',
        message: t('integrations.testFailed'),
      });
    }
  };

  // Toggle enabled
  const toggleEnabled = async (integration: Integration) => {
    try {
      await api.updateIntegration(integration.id, { enabled: !integration.enabled });
      fetchIntegrations();
    } catch (err) {
      console.error('Failed to toggle integration:', err);
    }
  };

  // Generate key from name
  const generateKey = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 100);
  };

  if (!organization) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertTriangle className="mx-auto text-yellow-500 mb-3" size={32} />
          <h3 className="font-semibold text-yellow-900">{t('integrations.noOrganization')}</h3>
          <p className="text-yellow-700 text-sm mt-1">{t('integrations.selectOrganization')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Zap className="text-orange-500" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('integrations.title')}</h1>
            <p className="text-sm text-gray-500">{t('integrations.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!isApiKeysConfigured}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          {t('integrations.newIntegration')}
        </button>
      </div>

      {/* API Keys not configured warning */}
      {!isApiKeysConfigured && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-orange-500 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-orange-900">{t('integrations.apiKeysNotConfigured')}</h3>
              <p className="text-orange-700 text-sm mt-1">{t('integrations.apiKeysNotConfiguredDesc')}</p>
              <a
                href="/settings"
                className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-800 text-sm font-medium mt-2"
              >
                <Settings size={14} />
                {t('integrations.goToSettings')}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && integrations.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Zap className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900">{t('integrations.noIntegrations')}</h3>
          <p className="text-gray-500 mt-1">{t('integrations.noIntegrationsDesc')}</p>
        </div>
      )}

      {/* Integrations table */}
      {!loading && !error && integrations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('integrations.name')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('integrations.key')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('integrations.httpMethod')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('integrations.status')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('integrations.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {integrations.map((integration) => (
                <tr key={integration.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{integration.name}</p>
                      {integration.description && (
                        <p className="text-sm text-gray-500 truncate max-w-xs">{integration.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{integration.key}</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      integration.httpMethod === 'GET' ? 'bg-blue-100 text-blue-700' :
                      integration.httpMethod === 'POST' ? 'bg-green-100 text-green-700' :
                      integration.httpMethod === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                      integration.httpMethod === 'PATCH' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {integration.httpMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleEnabled(integration)}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                        integration.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {integration.enabled ? (
                        <>
                          <CheckCircle2 size={12} />
                          {t('integrations.enabled')}
                        </>
                      ) : (
                        <>
                          <XCircle size={12} />
                          {t('integrations.disabled')}
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openTestModal(integration)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title={t('integrations.test')}
                      >
                        <TestTube2 size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(integration)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title={t('common.edit')}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingIntegration(integration);
                          setShowDeleteModal(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title={t('common.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingIntegration ? t('integrations.editIntegration') : t('integrations.newIntegration')}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* API Key Selection (only for create) */}
              {!editingIntegration && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('integrations.selectApiKey')} *
                  </label>
                  {loadingApiKeys ? (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Loader2 className="animate-spin" size={16} />
                      {t('common.loading')}
                    </div>
                  ) : (
                    <select
                      value={formApiKeyId}
                      onChange={(e) => {
                        const key = apiKeys.find(k => k.id === e.target.value);
                        setFormApiKeyId(e.target.value);
                        setFormApiKeyName(key?.name || '');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">{t('integrations.selectApiKeyPlaceholder')}</option>
                      {apiKeys.map((key) => (
                        <option key={key.id} value={key.id}>{key.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('integrations.customName')} *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!editingIntegration) {
                      setFormKey(generateKey(e.target.value));
                    }
                  }}
                  placeholder={t('integrations.customNameHint')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('integrations.description')}
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* HTTP Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('integrations.httpMethod')}
                </label>
                <select
                  value={formHttpMethod}
                  onChange={(e) => setFormHttpMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {HTTP_METHODS.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>

              {/* Endpoint */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('integrations.endpoint')}
                </label>
                <input
                  type="text"
                  value={formEndpoint}
                  onChange={(e) => setFormEndpoint(e.target.value)}
                  placeholder={t('integrations.endpointHint')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Default Payload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('integrations.defaultPayload')}
                </label>
                <textarea
                  value={formDefaultPayload}
                  onChange={(e) => setFormDefaultPayload(e.target.value)}
                  rows={4}
                  placeholder='{"key": "value"}'
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">{t('integrations.defaultPayloadHint')}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={formSaving || !formName || (!editingIntegration && (!formKey || !formApiKeyId))}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
              >
                {formSaving && <Loader2 className="animate-spin" size={16} />}
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showTestModal && testingIntegration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('integrations.testIntegration')}
              </h2>
              <button
                onClick={() => setShowTestModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{testingIntegration.name}</span>
                  <span className={`ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                    testingIntegration.httpMethod === 'GET' ? 'bg-blue-100 text-blue-700' :
                    testingIntegration.httpMethod === 'POST' ? 'bg-green-100 text-green-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {testingIntegration.httpMethod}
                  </span>
                </p>
                {testingIntegration.endpoint && (
                  <p className="text-xs text-gray-500 mt-1 font-mono">{testingIntegration.endpoint}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('integrations.testPayload')}
                </label>
                <textarea
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">{t('integrations.testPayloadInstructions')}</p>
              </div>

              {testResult.status !== 'idle' && (
                <div className={`p-4 rounded-lg ${
                  testResult.status === 'testing' ? 'bg-blue-50' :
                  testResult.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className={`flex items-center gap-2 text-sm font-medium ${
                    testResult.status === 'testing' ? 'text-blue-700' :
                    testResult.status === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {testResult.status === 'testing' && <Loader2 className="animate-spin" size={16} />}
                    {testResult.status === 'success' && <CheckCircle2 size={16} />}
                    {testResult.status === 'error' && <XCircle size={16} />}
                    {testResult.message}
                  </div>
                  {testResult.response && (
                    <pre className="mt-2 text-xs bg-white/50 p-2 rounded overflow-x-auto max-h-40">
                      {JSON.stringify(testResult.response, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {t('common.close')}
              </button>
              <button
                onClick={handleTest}
                disabled={testResult.status === 'testing'}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
              >
                {testResult.status === 'testing' && <Loader2 className="animate-spin" size={16} />}
                <TestTube2 size={16} />
                {t('integrations.runTest')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingIntegration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('integrations.confirmDelete')}</h3>
                  <p className="text-sm text-gray-500">{deletingIntegration.name}</p>
                </div>
              </div>
              <p className="text-gray-600">{t('integrations.confirmDeleteMsg')}</p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingIntegration(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-2">
          <div
            className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
            ) : (
              <XCircle size={20} className="shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium">{toast.message}</p>
              {toast.details && (
                <p className="text-sm mt-1 whitespace-pre-line opacity-80">{toast.details}</p>
              )}
            </div>
            <button
              onClick={() => setToast(null)}
              className="shrink-0 p-1 hover:bg-black/5 rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
