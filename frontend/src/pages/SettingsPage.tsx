import { useState } from 'react';
import type { FormEvent } from 'react';
import { Settings, Key, Link2, CheckCircle2, XCircle, TestTube2, Route, Building2, Hash, FolderKanban } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export function SettingsPage() {
  const { settings, updateExternalFormsConfig, updateExternalProjectsConfig, updateTenantConfig, isConfigured, isProjectsConfigured, isTenantConfigured } = useSettings();
  // Forms API configuration
  const [baseUrl, setBaseUrl] = useState(settings.externalForms.baseUrl);
  const [listEndpoint, setListEndpoint] = useState(
    settings.externalForms.listEndpoint || '/data-entry-forms/external/list'
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

  // Forms API handlers
  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    updateExternalFormsConfig({
      baseUrl: baseUrl.replace(/\/$/, ''),
      listEndpoint: listEndpoint.startsWith('/') ? listEndpoint : `/${listEndpoint}`,
      apiKey,
      enabled,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTest = async () => {
    if (!baseUrl || !apiKey) {
      setTestStatus('error');
      setTestMessage('Please fill in Base URL and API Key first');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Testing connection via proxy...');

    try {
      // Use PLM backend proxy to avoid CORS issues
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
        setTestStatus('success');
        setTestMessage(`Connection successful! Found ${data.items?.length || data.length || 0} forms.`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          setTestStatus('error');
          setTestMessage('Authentication failed. Please check your API Key.');
        } else {
          setTestStatus('error');
          setTestMessage(errorData.message || `Connection failed with status ${response.status}`);
        }
      }
    } catch {
      setTestStatus('error');
      setTestMessage('Connection failed. Please check the Base URL.');
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
      setProjectsTestMessage('Please fill in Base URL and API Key first');
      return;
    }

    setProjectsTestStatus('testing');
    setProjectsTestMessage('Testing connection via proxy...');

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
        setProjectsTestStatus('success');
        setProjectsTestMessage(`Connection successful! Found ${data.items?.length || data.length || 0} projects.`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          setProjectsTestStatus('error');
          setProjectsTestMessage('Authentication failed. Please check your API Key.');
        } else {
          setProjectsTestStatus('error');
          setProjectsTestMessage(errorData.message || `Connection failed with status ${response.status}`);
        }
      }
    } catch {
      setProjectsTestStatus('error');
      setProjectsTestMessage('Connection failed. Please check the Base URL.');
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-gray-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Configure PLM integrations and preferences</p>
        </div>
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
                <h2 className="text-lg font-semibold text-gray-900">External Forms API</h2>
                <p className="text-sm text-gray-500">Connect to external form definitions service</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConfigured ? (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 size={16} />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <XCircle size={16} />
                  Not configured
                </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base URL
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
            <p className="mt-1 text-xs text-gray-500">
              The base URL of the Forms API (e.g., http://72.61.52.70:3080/api/v1)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              List Endpoint
            </label>
            <div className="relative">
              <input
                type="text"
                value={listEndpoint}
                onChange={(e) => setListEndpoint(e.target.value)}
                placeholder="/data-entry-forms/external/list"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Route className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              The endpoint path to list forms (e.g., /data-entry-forms/external/list)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
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
            <p className="mt-1 text-xs text-gray-500">
              The X-API-Key header value for authentication
            </p>
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
            <span className="text-sm font-medium text-gray-700">Enable external forms integration</span>
          </div>

          {/* Test Connection */}
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

          {/* Saved notification */}
          {saved && (
            <div className="p-3 rounded-lg text-sm bg-green-50 text-green-700 flex items-center gap-2">
              <CheckCircle2 size={16} />
              Settings saved successfully!
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
              Test Connection
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Save Settings
            </button>
          </div>
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
                <h2 className="text-lg font-semibold text-gray-900">External Projects API</h2>
                <p className="text-sm text-gray-500">Connect to external projects service</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isProjectsConfigured ? (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 size={16} />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <XCircle size={16} />
                  Not configured
                </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleProjectsSave} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base URL
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
            <p className="mt-1 text-xs text-gray-500">
              The base URL of the Projects API (e.g., http://72.61.52.70:3080/api/v1)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              List Endpoint
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
            <p className="mt-1 text-xs text-gray-500">
              The endpoint path to list projects (e.g., /projects)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
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
            <p className="mt-1 text-xs text-gray-500">
              The X-API-Key header value for authentication
            </p>
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
            <span className="text-sm font-medium text-gray-700">Enable external projects integration</span>
          </div>

          {/* Test Connection */}
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

          {/* Saved notification */}
          {projectsSaved && (
            <div className="p-3 rounded-lg text-sm bg-green-50 text-green-700 flex items-center gap-2">
              <CheckCircle2 size={16} />
              Settings saved successfully!
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
              Test Connection
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Save Settings
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
                <h2 className="text-lg font-semibold text-gray-900">Tenant Configuration</h2>
                <p className="text-sm text-gray-500">Configure Tenant and Organization for API calls</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isTenantConfigured ? (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 size={16} />
                  Configured
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <XCircle size={16} />
                  Not configured
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
            // Dispatch event to notify TenantContext
            window.dispatchEvent(new CustomEvent('plm:tenant-updated', {
              detail: { tenantId, orgId }
            }));
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenant ID
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
            <p className="mt-1 text-xs text-gray-500">
              The UUID of the tenant (X-Tenant-Id header)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization ID
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
            <p className="mt-1 text-xs text-gray-500">
              The organization identifier (X-Organization-Id header)
            </p>
          </div>

          {tenantSaved && (
            <div className="p-3 rounded-lg text-sm bg-green-50 text-green-700 flex items-center gap-2">
              <CheckCircle2 size={16} />
              Tenant settings saved successfully!
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              Save Tenant Settings
            </button>
          </div>
        </form>
      </div>

      {/* Info */}
      <div className="mt-6 bg-blue-50 rounded-lg border border-blue-200 p-4">
        <h3 className="text-sm font-medium text-blue-700 mb-2">TAH Integration (Future)</h3>
        <p className="text-sm text-blue-600">
          In a future version, Tenant and Organization context will be automatically provided by TAH
          (Tenant Access Hub) after authentication.
        </p>
      </div>
    </div>
  );
}
