import { useState, useEffect } from 'react';
import { FileText, AlertCircle, RefreshCw, Eye, Plus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';

type TabFilter = 'all' | 'published' | 'draft';

interface FormDefinition {
  id: string;
  name: string;
  status: string;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export function FormsPage() {
  const { organization } = useTenant();
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const fetchForms = async (filter?: TabFilter) => {
    if (!organization) return;

    setLoading(true);
    setError(null);

    try {
      const status = filter === 'all' || !filter ? undefined : filter;
      const { items } = await api.getForms(status);
      setForms(items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organization) {
      fetchForms(activeTab);
    }
  }, [organization, activeTab]);

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'published', label: 'Publicados' },
    { key: 'draft', label: 'Rascunhos' },
  ];

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">Selecione uma Organização</h2>
          <p className="text-gray-500 mt-2">Escolha um tenant e organização na barra lateral para ver formulários.</p>
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
            <p className="text-sm text-gray-500">Definições de formulários</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchForms(activeTab)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <Link
            to="/forms/new"
            className="btn-primary"
          >
            <Plus size={18} className="mr-2" />
            Novo Formulário
          </Link>
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
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <FileText className="mx-auto mb-3 text-gray-300" size={48} />
          <h2 className="text-lg font-medium text-gray-600">
            {activeTab === 'all'
              ? 'Nenhum formulário ainda'
              : activeTab === 'published'
              ? 'Nenhum formulário publicado'
              : 'Nenhum rascunho'}
          </h2>
          <p className="text-gray-500 mt-1">
            {activeTab === 'all'
              ? 'Crie seu primeiro formulário para começar'
              : activeTab === 'published'
              ? 'Publique um formulário para vê-lo aqui'
              : 'Formulários em rascunho aparecerão aqui'}
          </p>
          {activeTab === 'all' && (
            <Link
              to="/forms/new"
              className="btn-primary mt-4 inline-flex"
            >
              <Plus size={18} className="mr-2" />
              Criar Formulário
            </Link>
          )}
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
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>v{form.version}</span>
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
                  <Link
                    to={`/forms/${form.id}`}
                    className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                    title="Ver formulário"
                  >
                    <Eye size={16} />
                    Ver
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
