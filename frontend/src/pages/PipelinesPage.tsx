import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Workflow, Users, AlertCircle, Settings, Play } from 'lucide-react';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { Modal } from '../components/ui';
import type { Pipeline } from '../types';

type TabFilter = 'all' | 'published' | 'draft';

export function PipelinesPage() {
  const { organization } = useTenant();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPipeline, setNewPipeline] = useState({ key: '', name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const fetchPipelines = async (filter?: TabFilter) => {
    if (!organization) return;
    setLoading(true);
    try {
      const status = filter === 'all' || !filter ? undefined : filter;
      const { items } = await api.getPipelines(status);
      setPipelines(items);
    } catch (err) {
      console.error('Failed to fetch pipelines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines(activeTab);
  }, [organization, activeTab]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPipeline.key || !newPipeline.name) return;

    setCreating(true);
    setError(null);
    try {
      await api.createPipeline(newPipeline);
      setShowCreateModal(false);
      setNewPipeline({ key: '', name: '', description: '' });
      fetchPipelines(activeTab);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to create pipeline';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

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
          <h2 className="text-xl font-semibold text-gray-600">Select an Organization</h2>
          <p className="text-gray-500 mt-2">Choose a tenant and organization from the sidebar to view pipelines.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'published', label: 'Publicados' },
    { key: 'draft', label: 'Rascunhos' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipelines</h1>
          <p className="text-gray-500 mt-1">Manage your workflow pipelines</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus size={18} className="mr-2" />
          New Pipeline
        </button>
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

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading pipelines...</p>
        </div>
      ) : pipelines.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <Workflow size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-600">
            {activeTab === 'all'
              ? 'Nenhum pipeline ainda'
              : activeTab === 'published'
              ? 'Nenhum pipeline publicado'
              : 'Nenhum rascunho'}
          </h2>
          <p className="text-gray-500 mt-1">
            {activeTab === 'all'
              ? 'Crie seu primeiro pipeline para começar'
              : activeTab === 'published'
              ? 'Publique um pipeline para vê-lo aqui'
              : 'Pipelines em rascunho aparecerão aqui'}
          </p>
          {activeTab === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary mt-4"
            >
              <Plus size={18} className="mr-2" />
              Criar Pipeline
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pipelines.map((pipeline) => (
            <div
              key={pipeline.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {pipeline.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{pipeline.key}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[pipeline.lifecycleStatus]}`}>
                  {pipeline.lifecycleStatus}
                </span>
              </div>

              {pipeline.description && (
                <p className="text-sm text-gray-600 mt-3 line-clamp-2">{pipeline.description}</p>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  {pipeline.publishedVersion ? `v${pipeline.publishedVersion}` : 'Não publicado'}
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/pipelines/${pipeline.id}/edit`}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    title="Editar pipeline"
                  >
                    <Settings size={14} />
                    Editar
                  </Link>
                  {pipeline.publishedVersion && (
                    <Link
                      to={`/pipelines/${pipeline.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                      title="Ver Kanban"
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

      {/* Create Pipeline Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setError(null);
        }}
        title="Create Pipeline"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div>
            <label className="label">Key</label>
            <input
              type="text"
              value={newPipeline.key}
              onChange={(e) => setNewPipeline({ ...newPipeline, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              className="input mt-1"
              placeholder="e.g., sales_pipeline"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Unique identifier for this pipeline</p>
          </div>

          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={newPipeline.name}
              onChange={(e) => setNewPipeline({ ...newPipeline, name: e.target.value })}
              className="input mt-1"
              placeholder="e.g., Sales Pipeline"
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={newPipeline.description}
              onChange={(e) => setNewPipeline({ ...newPipeline, description: e.target.value })}
              className="input mt-1"
              rows={3}
              placeholder="Optional description..."
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !newPipeline.key || !newPipeline.name}
              className="btn-primary"
            >
              {creating ? 'Creating...' : 'Create Pipeline'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
