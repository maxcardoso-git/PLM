import { useState, useEffect } from 'react';
import { FileText, AlertCircle, RefreshCw, Eye, FolderOpen, Settings, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

interface FormDefinition {
  id: string;
  name: string;
  description?: string;
  status: string;
  version?: number;
  projectId?: string;
  projectName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FormsByProject {
  projectId: string;
  projectName: string;
  forms: FormDefinition[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export function FormsPage() {
  const { settings, isConfigured } = useSettings();
  const [formsByProject, setFormsByProject] = useState<FormsByProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const fetchForms = async () => {
    if (!isConfigured) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch from external API via proxy
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
      const forms: FormDefinition[] = data.items || data || [];

      // Group forms by project
      const grouped = forms.reduce((acc: Record<string, FormsByProject>, form) => {
        const projectId = form.projectId || 'no-project';
        const projectName = form.projectName || 'Sem Projeto';

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

      // Auto-expand all projects initially
      setExpandedProjects(new Set(sortedProjects.map(p => p.projectId)));
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
                            {form.version && <span>v{form.version}</span>}
                            <span className="font-mono">{form.id}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            form.status === 'published' || form.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : form.status === 'draft'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {form.status}
                        </span>
                        <button
                          className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
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
    </div>
  );
}
