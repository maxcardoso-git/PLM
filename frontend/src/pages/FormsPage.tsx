import { useState, useEffect } from 'react';
import { FileText, AlertCircle, Settings, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface ExternalForm {
  id: string;
  name: string;
  description?: string;
  status: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export function FormsPage() {
  const { settings, isConfigured } = useSettings();
  const [forms, setForms] = useState<ExternalForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForms = async () => {
    if (!isConfigured) return;

    setLoading(true);
    setError(null);

    try {
      // Use PLM backend proxy to avoid CORS issues
      const endpoint = settings.externalForms.listEndpoint || '/data-entry-forms/external/list';
      const response = await fetch(`${API_BASE_URL}/external-forms/proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: settings.externalForms.baseUrl,
          endpoint,
          apiKey: settings.externalForms.apiKey,
          method: 'GET',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch forms: ${response.status}`);
      }

      const data = await response.json();

      // Handle various API response structures
      let formsList: ExternalForm[] = [];
      if (Array.isArray(data)) {
        formsList = data;
      } else if (Array.isArray(data.items)) {
        formsList = data.items;
      } else if (Array.isArray(data.data)) {
        formsList = data.data;
      } else if (Array.isArray(data.results)) {
        formsList = data.results;
      } else if (Array.isArray(data.forms)) {
        formsList = data.forms;
      } else {
        console.warn('Unexpected API response structure:', data);
        throw new Error('Unexpected API response format. Check the List Endpoint configuration.');
      }

      setForms(formsList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConfigured) {
      fetchForms();
    }
  }, [isConfigured, settings.externalForms.baseUrl, settings.externalForms.listEndpoint]);

  if (!isConfigured) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="text-gray-400" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
            <p className="text-sm text-gray-500">External form definitions</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto text-amber-500 mb-3" size={40} />
          <h2 className="text-lg font-semibold text-amber-800 mb-2">
            External Forms API Not Configured
          </h2>
          <p className="text-sm text-amber-700 mb-4">
            Please configure the external Forms API in Settings to view available forms.
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
          >
            <Settings size={16} />
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="text-gray-400" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
            <p className="text-sm text-gray-500">
              External form definitions from {new URL(settings.externalForms.baseUrl).host}
            </p>
          </div>
        </div>
        <button
          onClick={fetchForms}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
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
      ) : forms.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="mx-auto mb-3 text-gray-300" size={48} />
          <p>No forms available</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {forms.map((form) => (
            <div
              key={form.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{form.name}</h3>
                    {form.description && (
                      <p className="text-sm text-gray-500 mt-1">{form.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>ID: {form.id}</span>
                      {form.version && <span>v{form.version}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      form.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : form.status === 'draft'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {form.status}
                  </span>
                  <a
                    href={`${settings.externalForms.baseUrl}/data-entry-forms/external/${form.id}/schema`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="View schema"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
