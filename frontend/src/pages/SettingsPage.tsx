import { useState } from 'react';
import type { FormEvent } from 'react';
import { Settings, Key, Link2, CheckCircle2, XCircle, TestTube2, Route } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export function SettingsPage() {
  const { settings, updateExternalFormsConfig, isConfigured } = useSettings();
  const [baseUrl, setBaseUrl] = useState(settings.externalForms.baseUrl);
  const [listEndpoint, setListEndpoint] = useState(
    settings.externalForms.listEndpoint || '/data-entry-forms/external/list'
  );
  const [apiKey, setApiKey] = useState(settings.externalForms.apiKey);
  const [enabled, setEnabled] = useState(settings.externalForms.enabled);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saved, setSaved] = useState(false);

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
    } catch (error) {
      setTestStatus('error');
      setTestMessage('Connection failed. Please check the Base URL.');
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

      {/* TAH Integration Info */}
      <div className="mt-6 bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">TAH Integration</h3>
        <p className="text-sm text-gray-500">
          Tenant and Organization context will be automatically provided by TAH (Tenant Access Hub)
          after authentication. No manual selection is required.
        </p>
      </div>
    </div>
  );
}
