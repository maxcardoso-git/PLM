import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Play,
  Settings,
  ArrowRight,
  GripVertical,
  RefreshCw,
  CheckCircle2,
  Circle,
  Flag,
  AlertTriangle,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { Modal } from '../components/ui';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface Stage {
  id: string;
  name: string;
  stageOrder: number;
  classification: string;
  color: string;
  isInitial: boolean;
  isFinal: boolean;
  wipLimit?: number;
  slaHours?: number;
  active: boolean;
  transitionsFrom?: { toStage: { id: string; name: string; color: string } }[];
}

interface PipelineVersion {
  id: string;
  version: number;
  status: string;
  publishedAt?: string;
  stages: Stage[];
}

interface Pipeline {
  id: string;
  key: string;
  name: string;
  description?: string;
  lifecycleStatus: string;
  publishedVersion?: number;
  versions: PipelineVersion[];
}

const CLASSIFICATIONS = [
  { value: 'NOT_STARTED', label: 'Not Started', color: '#9CA3AF' },
  { value: 'ON_GOING', label: 'In Progress', color: '#3B82F6' },
  { value: 'WAITING', label: 'Waiting', color: '#F59E0B' },
  { value: 'FINISHED', label: 'Finished', color: '#10B981' },
  { value: 'CANCELED', label: 'Canceled', color: '#EF4444' },
];

const STAGE_COLORS = [
  '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4',
];

export function PipelineEditorPage() {
  const { pipelineId } = useParams<{ pipelineId: string }>();
  const { organization, tenant } = useTenant();
  const navigate = useNavigate();

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stage modal
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [stageForm, setStageForm] = useState({
    name: '',
    classification: 'NOT_STARTED',
    color: '#6B7280',
    isInitial: false,
    isFinal: false,
    wipLimit: '',
    slaHours: '',
  });
  const [savingStage, setSavingStage] = useState(false);

  // Transition modal
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [transitionFrom, setTransitionFrom] = useState<Stage | null>(null);
  const [transitionTo, setTransitionTo] = useState<string>('');
  const [savingTransition, setSavingTransition] = useState(false);

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; data?: any } | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant-Id': tenant?.id || '',
    'X-Organization-Id': organization?.id || '',
  };

  const fetchPipeline = useCallback(async () => {
    if (!pipelineId || !organization) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pipelines/${pipelineId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch pipeline');
      const data = await res.json();
      setPipeline(data);

      // Set latest version as selected
      if (data.versions?.length > 0) {
        const latestVersion = data.versions[0].version;
        setSelectedVersion(latestVersion);
        fetchVersionStages(latestVersion);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pipeline');
    } finally {
      setLoading(false);
    }
  }, [pipelineId, organization]);

  const fetchVersionStages = async (version: number) => {
    if (!pipelineId) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/pipelines/${pipelineId}/versions/${version}/stages`,
        { headers }
      );
      if (!res.ok) throw new Error('Failed to fetch stages');
      const data = await res.json();
      setStages(data.items || data || []);
    } catch (err) {
      console.error('Failed to fetch stages:', err);
      setStages([]);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const handleCreateStage = () => {
    setEditingStage(null);
    setStageForm({
      name: '',
      classification: 'NOT_STARTED',
      color: STAGE_COLORS[stages.length % STAGE_COLORS.length],
      isInitial: stages.length === 0,
      isFinal: false,
      wipLimit: '',
      slaHours: '',
    });
    setShowStageModal(true);
  };

  const handleEditStage = (stage: Stage) => {
    setEditingStage(stage);
    setStageForm({
      name: stage.name,
      classification: stage.classification,
      color: stage.color,
      isInitial: stage.isInitial,
      isFinal: stage.isFinal,
      wipLimit: stage.wipLimit?.toString() || '',
      slaHours: stage.slaHours?.toString() || '',
    });
    setShowStageModal(true);
  };

  const handleSaveStage = async () => {
    if (!stageForm.name || !pipelineId) return;

    setSavingStage(true);
    try {
      const payload = {
        name: stageForm.name,
        classification: stageForm.classification,
        color: stageForm.color,
        isInitial: stageForm.isInitial,
        isFinal: stageForm.isFinal,
        wipLimit: stageForm.wipLimit ? parseInt(stageForm.wipLimit) : null,
        slaHours: stageForm.slaHours ? parseInt(stageForm.slaHours) : null,
        stageOrder: editingStage ? editingStage.stageOrder : stages.length + 1,
        active: true,
      };

      if (editingStage) {
        await fetch(`${API_BASE_URL}/stages/${editingStage.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(
          `${API_BASE_URL}/pipelines/${pipelineId}/versions/${selectedVersion}/stages`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          }
        );
      }

      setShowStageModal(false);
      fetchVersionStages(selectedVersion);
    } catch (err) {
      console.error('Failed to save stage:', err);
    } finally {
      setSavingStage(false);
    }
  };

  const handleDeleteStageClick = (stage: Stage) => {
    setConfirmAction({ type: 'deleteStage', data: stage });
    setShowConfirmModal(true);
  };

  const handleDeleteStage = async (stageId: string) => {
    try {
      await fetch(`${API_BASE_URL}/stages/${stageId}`, {
        method: 'DELETE',
        headers,
      });
      setShowConfirmModal(false);
      fetchVersionStages(selectedVersion);
      showToast('success', 'Etapa excluída com sucesso!');
    } catch (err) {
      showToast('error', 'Falha ao excluir etapa');
    }
  };

  const handleAddTransition = (stage: Stage) => {
    setTransitionFrom(stage);
    setTransitionTo('');
    setShowTransitionModal(true);
  };

  const handleSaveTransition = async () => {
    if (!transitionFrom || !transitionTo || !pipelineId) return;

    setSavingTransition(true);
    try {
      await fetch(
        `${API_BASE_URL}/pipelines/${pipelineId}/versions/${selectedVersion}/transitions`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fromStageId: transitionFrom.id,
            toStageId: transitionTo,
          }),
        }
      );
      setShowTransitionModal(false);
      fetchVersionStages(selectedVersion);
    } catch (err) {
      console.error('Failed to create transition:', err);
    } finally {
      setSavingTransition(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePublishClick = () => {
    setConfirmAction({ type: 'publish' });
    setShowConfirmModal(true);
  };

  const handlePublish = async () => {
    if (!pipelineId) return;

    setPublishing(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/pipelines/${pipelineId}/versions/${selectedVersion}/publish`,
        {
          method: 'POST',
          headers,
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to publish');
      }

      setShowConfirmModal(false);
      fetchPipeline();
      showToast('success', 'Pipeline publicado com sucesso!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Falha ao publicar');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !pipeline) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || 'Pipeline not found'}</p>
        <Link to="/pipelines" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Pipelines
        </Link>
      </div>
    );
  }

  const currentVersion = pipeline.versions?.find((v) => v.version === selectedVersion);
  const canPublish = stages.length > 0 &&
    stages.some((s) => s.isInitial) &&
    stages.some((s) => s.isFinal) &&
    currentVersion?.status === 'draft';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/pipelines"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pipeline.name}</h1>
            <p className="text-sm text-gray-500">
              {pipeline.key} | Version {selectedVersion} ({currentVersion?.status})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pipeline.publishedVersion && (
            <button
              onClick={() => navigate(`/pipelines/${pipelineId}`)}
              className="btn-secondary"
            >
              <Play size={18} className="mr-2" />
              View Kanban
            </button>
          )}

          <button
            onClick={handlePublishClick}
            disabled={!canPublish}
            className="btn-primary"
            title={!canPublish ? 'Need at least one initial and one final stage' : ''}
          >
            <CheckCircle2 size={18} className="mr-2" />
            Publicar
          </button>
        </div>
      </div>

      {/* Version Selector */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">Version:</span>
        <select
          value={selectedVersion}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            setSelectedVersion(v);
            fetchVersionStages(v);
          }}
          className="input w-32"
        >
          {pipeline.versions?.map((v) => (
            <option key={v.id} value={v.version}>
              v{v.version} ({v.status})
            </option>
          ))}
        </select>

        <button
          onClick={() => fetchVersionStages(selectedVersion)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stages */}
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Stages ({stages.length})
          </h2>
          <button onClick={handleCreateStage} className="btn-primary btn-sm">
            <Plus size={16} className="mr-1" />
            Add Stage
          </button>
        </div>

        {stages.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
            <Circle size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">No stages yet</h3>
            <p className="text-gray-500 mt-1">Add stages to define your workflow</p>
            <button onClick={handleCreateStage} className="btn-primary mt-4">
              <Plus size={18} className="mr-2" />
              Add First Stage
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {stages
              .sort((a, b) => a.stageOrder - b.stageOrder)
              .map((stage) => (
                <div
                  key={stage.id}
                  className="bg-white rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center gap-4">
                    <GripVertical size={20} className="text-gray-300" />

                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{stage.name}</span>
                        {stage.isInitial && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Play size={10} /> Initial
                          </span>
                        )}
                        {stage.isFinal && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Flag size={10} /> Final
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {CLASSIFICATIONS.find((c) => c.value === stage.classification)?.label}
                        {stage.wipLimit && ` | WIP: ${stage.wipLimit}`}
                        {stage.slaHours && ` | SLA: ${stage.slaHours}h`}
                      </div>
                    </div>

                    {/* Transitions */}
                    <div className="flex items-center gap-2">
                      {stage.transitionsFrom?.map((t) => (
                        <span
                          key={t.toStage.id}
                          className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1"
                        >
                          <ArrowRight size={12} />
                          {t.toStage.name}
                        </span>
                      ))}
                      <button
                        onClick={() => handleAddTransition(stage)}
                        className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                        title="Add transition"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditStage(stage)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <Settings size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteStageClick(stage)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Stage Modal */}
      <Modal
        isOpen={showStageModal}
        onClose={() => setShowStageModal(false)}
        title={editingStage ? 'Edit Stage' : 'Create Stage'}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={stageForm.name}
              onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
              className="input mt-1"
              placeholder="e.g., To Do, In Progress, Done"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Classification</label>
            <select
              value={stageForm.classification}
              onChange={(e) => setStageForm({ ...stageForm, classification: e.target.value })}
              className="input mt-1"
            >
              {CLASSIFICATIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 mt-1">
              {STAGE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setStageForm({ ...stageForm, color })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    stageForm.color === color ? 'border-gray-900' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">WIP Limit (optional)</label>
              <input
                type="number"
                value={stageForm.wipLimit}
                onChange={(e) => setStageForm({ ...stageForm, wipLimit: e.target.value })}
                className="input mt-1"
                placeholder="e.g., 5"
                min="1"
              />
            </div>
            <div>
              <label className="label">SLA Hours (optional)</label>
              <input
                type="number"
                value={stageForm.slaHours}
                onChange={(e) => setStageForm({ ...stageForm, slaHours: e.target.value })}
                className="input mt-1"
                placeholder="e.g., 24"
                min="1"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={stageForm.isInitial}
                onChange={(e) => setStageForm({ ...stageForm, isInitial: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Initial Stage</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={stageForm.isFinal}
                onChange={(e) => setStageForm({ ...stageForm, isFinal: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Final Stage</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowStageModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSaveStage}
              disabled={savingStage || !stageForm.name}
              className="btn-primary"
            >
              {savingStage ? 'Saving...' : 'Save Stage'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Transition Modal */}
      <Modal
        isOpen={showTransitionModal}
        onClose={() => setShowTransitionModal(false)}
        title="Add Transition"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            From: <span className="font-semibold">{transitionFrom?.name}</span>
          </p>

          <div>
            <label className="label">To Stage</label>
            <select
              value={transitionTo}
              onChange={(e) => setTransitionTo(e.target.value)}
              className="input mt-1"
            >
              <option value="">Select a stage...</option>
              {stages
                .filter((s) => s.id !== transitionFrom?.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowTransitionModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSaveTransition}
              disabled={savingTransition || !transitionTo}
              className="btn-primary"
            >
              {savingTransition ? 'Adding...' : 'Add Transition'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !publishing && setShowConfirmModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${
                  confirmAction?.type === 'publish'
                    ? 'bg-blue-100'
                    : 'bg-red-100'
                }`}>
                  {confirmAction?.type === 'publish' ? (
                    <CheckCircle2 size={24} className="text-blue-600" />
                  ) : (
                    <AlertTriangle size={24} className="text-red-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {confirmAction?.type === 'publish'
                      ? 'Publicar Pipeline'
                      : 'Excluir Etapa'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {confirmAction?.type === 'publish'
                      ? 'Esta versão ficará disponível para novos cards.'
                      : `Tem certeza que deseja excluir "${confirmAction?.data?.name}"?`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={publishing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmAction?.type === 'publish') {
                    handlePublish();
                  } else if (confirmAction?.type === 'deleteStage') {
                    handleDeleteStage(confirmAction.data.id);
                  }
                }}
                disabled={publishing}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  confirmAction?.type === 'publish'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {publishing && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {confirmAction?.type === 'publish'
                  ? publishing ? 'Publicando...' : 'Publicar'
                  : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <AlertCircle size={20} className="text-red-500" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 p-1 rounded hover:bg-black/5 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
