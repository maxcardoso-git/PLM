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
  FileText,
  Link2,
  XCircle,
  GitBranch,
  List,
  Zap,
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useSettings } from '../context/SettingsContext';
import { Modal } from '../components/ui';
import { api } from '../services/api';
import type { Integration, StageTrigger, TriggerEventType, TriggerOperator } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface FormAttachRule {
  id: string;
  formDefinitionId?: string;
  externalFormId?: string;
  externalFormName?: string;
  externalFormVersion?: number;
  defaultFormStatus: string;
  lockOnLeaveStage: boolean;
  formDefinition?: {
    id: string;
    name: string;
    version: number;
  };
}

interface Transition {
  id: string;
  toStage: { id: string; name: string; color: string };
}

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
  transitionsFrom?: Transition[];
  formAttachRules?: FormAttachRule[];
  triggers?: StageTrigger[];
}

type EditorTab = 'stages' | 'flow';

interface FormField {
  id: string;
  name: string;
  type?: string;
  label?: string;
}

interface FormDefinition {
  id: string;
  name: string;
  version: number;
  status: string;
  biaStatus?: string;
  projectId?: string;
  projectName?: string;
  project?: {
    id: string;
    name: string;
  };
  schemaJson?: {
    fields?: FormField[];
    [key: string]: unknown;
  };
  fields?: FormField[];
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
  projectId?: string;
  projectName?: string;
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
  const { settings, isConfigured: isFormsConfigured } = useSettings();
  const navigate = useNavigate();

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('stages');

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
  const [unpublishing, setUnpublishing] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form attachment modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [formStage, setFormStage] = useState<Stage | null>(null);
  const [availableForms, setAvailableForms] = useState<FormDefinition[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [formSettings, setFormSettings] = useState({
    defaultFormStatus: 'TO_FILL',
    lockOnLeaveStage: false,
  });
  const [savingForm, setSavingForm] = useState(false);

  // Trigger modal
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [triggerStage, setTriggerStage] = useState<Stage | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [triggerForm, setTriggerForm] = useState<{
    integrationId: string;
    eventType: TriggerEventType;
    fromStageId: string;
    formDefinitionId: string;
    fieldId: string;
    conditions: { fieldPath: string; operator: TriggerOperator; value: string }[];
  }>({
    integrationId: '',
    eventType: 'CARD_MOVEMENT',
    fromStageId: '',
    formDefinitionId: '',
    fieldId: '',
    conditions: [],
  });
  const [savingTrigger, setSavingTrigger] = useState(false);

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
      showToast('success', 'Transição adicionada!');
    } catch (err) {
      console.error('Failed to create transition:', err);
      showToast('error', 'Falha ao adicionar transição');
    } finally {
      setSavingTransition(false);
    }
  };

  const handleDeleteTransition = async (transitionId: string) => {
    try {
      await fetch(`${API_BASE_URL}/transitions/${transitionId}`, {
        method: 'DELETE',
        headers,
      });
      fetchVersionStages(selectedVersion);
      showToast('success', 'Transição removida!');
    } catch (err) {
      showToast('error', 'Falha ao remover transição');
    }
  };

  // Form attachment functions
  const fetchForms = async () => {
    // If external forms API is configured, use it
    if (isFormsConfigured && settings.externalForms.baseUrl) {
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
          console.error('Failed to fetch external forms:', response.status);
          return;
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
        }

        console.log('Pipeline projectId:', pipeline?.projectId);
        console.log('All forms count:', allForms.length);

        // Debug: log all forms with their project and status info
        allForms.forEach((form, i) => {
          const formAny = form as any;
          const formProjectId = form.project?.id || form.projectId || formAny.project_id || formAny.projectId;
          const biaValue = formAny.biaStatus || formAny.BIAStatus || formAny.bia_status || formAny.biastatus;
          console.log(`Form ${i}: "${form.name}" - projectId=${formProjectId}, status=${form.status}, biaStatus=${biaValue}`);
        });

        // Filter by pipeline's project and status (Published AND Approved)
        const filteredForms = allForms.filter(form => {
          const formAny = form as any;

          // Check if form belongs to same project as pipeline
          const formProjectId = form.project?.id || form.projectId || formAny.project_id || formAny.projectId;
          const matchesProject = !pipeline?.projectId || formProjectId === pipeline.projectId;

          // Check status: Published AND Approved (BIA)
          const isPublished = form.status?.toLowerCase() === 'published';
          const biaValue = formAny.biaStatus || formAny.BIAStatus || formAny.bia_status || formAny.biastatus;
          const isApproved = biaValue?.toLowerCase() === 'approved';

          const passes = matchesProject && isPublished && isApproved;
          if (!passes) {
            console.log(`Form "${form.name}" filtered out: matchesProject=${matchesProject}, isPublished=${isPublished}, isApproved=${isApproved}`);
          }
          return passes;
        });

        console.log('Filtered forms count:', filteredForms.length);
        setAvailableForms(filteredForms);
      } catch (err) {
        console.error('Failed to fetch external forms:', err);
      }
    } else {
      // Fallback to internal forms API
      try {
        const res = await fetch(`${API_BASE_URL}/forms?status=published`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        setAvailableForms(data.items || []);
      } catch (err) {
        console.error('Failed to fetch forms:', err);
      }
    }
  };

  const handleOpenFormModal = async (stage: Stage) => {
    setFormStage(stage);
    setSelectedFormId('');
    setFormSettings({ defaultFormStatus: 'TO_FILL', lockOnLeaveStage: false });
    await fetchForms();
    setShowFormModal(true);
  };

  const handleAttachForm = async () => {
    if (!formStage || !selectedFormId) return;

    setSavingForm(true);
    try {
      // Find selected form to get name/version
      const selectedForm = availableForms.find(f => f.id === selectedFormId);

      // Determine payload based on whether using external forms
      const isUsingExternalForms = isFormsConfigured && settings.externalForms.baseUrl;

      console.log('[DEBUG] handleAttachForm:', {
        isFormsConfigured,
        baseUrl: settings.externalForms.baseUrl,
        isUsingExternalForms,
        selectedFormId,
        selectedForm: selectedForm?.name,
      });

      // Build payload - for external forms, only include version if it's a valid number
      const externalVersion = selectedForm?.version != null
        ? (typeof selectedForm.version === 'string' ? parseInt(selectedForm.version, 10) : selectedForm.version)
        : undefined;

      const payload = isUsingExternalForms
        ? {
            externalFormId: selectedFormId,
            externalFormName: selectedForm?.name || 'Unknown Form',
            ...(externalVersion != null && !isNaN(externalVersion) ? { externalFormVersion: externalVersion } : {}),
            defaultFormStatus: formSettings.defaultFormStatus,
            lockOnLeaveStage: formSettings.lockOnLeaveStage,
          }
        : {
            formDefinitionId: selectedFormId,
            defaultFormStatus: formSettings.defaultFormStatus,
            lockOnLeaveStage: formSettings.lockOnLeaveStage,
          };

      console.log('[DEBUG] Sending payload:', JSON.stringify(payload, null, 2));

      const res = await fetch(`${API_BASE_URL}/stages/${formStage.id}/attach-forms`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Falha ao vincular formulário');
      }

      setShowFormModal(false);
      fetchVersionStages(selectedVersion);
      showToast('success', 'Formulário vinculado com sucesso!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Falha ao vincular formulário');
    } finally {
      setSavingForm(false);
    }
  };

  const handleDetachForm = async (ruleId: string) => {
    setConfirmAction({ type: 'detachForm', data: { ruleId } });
    setShowConfirmModal(true);
  };

  const executeDetachForm = async (ruleId: string) => {
    try {
      await fetch(`${API_BASE_URL}/stage-form-rules/${ruleId}`, {
        method: 'DELETE',
        headers,
      });
      setShowConfirmModal(false);
      fetchVersionStages(selectedVersion);
      showToast('success', 'Formulário desvinculado!');
    } catch (err) {
      showToast('error', 'Falha ao desvincular formulário');
    }
  };

  // Trigger functions
  const fetchIntegrations = async () => {
    try {
      const result = await api.getIntegrations();
      setIntegrations(result.items || []);
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
    }
  };

  const handleOpenTriggerModal = async (stage: Stage) => {
    setTriggerStage(stage);
    setTriggerForm({
      integrationId: '',
      eventType: 'CARD_MOVEMENT',
      fromStageId: '',
      formDefinitionId: '',
      fieldId: '',
      conditions: [],
    });
    await Promise.all([fetchIntegrations(), fetchForms()]);
    setShowTriggerModal(true);
  };

  const handleSaveTrigger = async () => {
    if (!triggerStage || !triggerForm.integrationId) return;

    setSavingTrigger(true);
    try {
      await api.createStageTrigger(triggerStage.id, {
        integrationId: triggerForm.integrationId,
        eventType: triggerForm.eventType,
        fromStageId: triggerForm.fromStageId || undefined,
        formDefinitionId: triggerForm.formDefinitionId || undefined,
        fieldId: triggerForm.fieldId || undefined,
        conditions: triggerForm.conditions.filter(c => c.fieldPath && c.value),
      });

      setShowTriggerModal(false);
      fetchVersionStages(selectedVersion);
      showToast('success', 'Gatilho criado com sucesso!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Falha ao criar gatilho');
    } finally {
      setSavingTrigger(false);
    }
  };

  const handleDeleteTrigger = async (triggerId: string) => {
    try {
      await api.deleteStageTrigger(triggerId);
      fetchVersionStages(selectedVersion);
      showToast('success', 'Gatilho removido!');
    } catch (err) {
      showToast('error', 'Falha ao remover gatilho');
    }
  };

  const addCondition = () => {
    setTriggerForm({
      ...triggerForm,
      conditions: [...triggerForm.conditions, { fieldPath: '', operator: 'EQUALS', value: '' }],
    });
  };

  const removeCondition = (index: number) => {
    setTriggerForm({
      ...triggerForm,
      conditions: triggerForm.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (index: number, field: string, value: string) => {
    const newConditions = [...triggerForm.conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setTriggerForm({ ...triggerForm, conditions: newConditions });
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

  const handleUnpublishClick = () => {
    setConfirmAction({ type: 'unpublish' });
    setShowConfirmModal(true);
  };

  const handleUnpublish = async () => {
    if (!pipelineId) return;

    setUnpublishing(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/pipelines/${pipelineId}/versions/${selectedVersion}/unpublish`,
        {
          method: 'POST',
          headers,
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to unpublish');
      }

      setShowConfirmModal(false);
      fetchPipeline();
      showToast('success', 'Pipeline despublicado com sucesso!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Falha ao despublicar');
    } finally {
      setUnpublishing(false);
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
  const canUnpublish = currentVersion?.status === 'published';

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

          {canUnpublish && (
            <button
              onClick={handleUnpublishClick}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <XCircle size={18} />
              Despublicar
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

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('stages')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'stages'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <List size={16} />
          Etapas ({stages.length})
        </button>
        <button
          onClick={() => setActiveTab('flow')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'flow'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <GitBranch size={16} />
          Fluxo Visual
        </button>
      </div>

      {/* Stages Tab */}
      {activeTab === 'stages' && (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Configurar Etapas e Transições
          </h2>
          <button onClick={handleCreateStage} className="btn-primary btn-sm">
            <Plus size={16} className="mr-1" />
            Adicionar Etapa
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
                    <div className="flex items-center gap-2 flex-wrap">
                      {stage.transitionsFrom?.map((t) => (
                        <span
                          key={t.id}
                          className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1 group"
                        >
                          <ArrowRight size={12} />
                          {t.toStage.name}
                          <button
                            onClick={() => handleDeleteTransition(t.id)}
                            className="ml-1 text-blue-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remover transição"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      <button
                        onClick={() => handleAddTransition(stage)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-full border border-dashed border-blue-300"
                        title="Adicionar transição"
                      >
                        <Plus size={12} />
                        Transição
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenFormModal(stage)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                        title="Vincular formulário"
                      >
                        <FileText size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenTriggerModal(stage)}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                        title="Configurar gatilhos"
                      >
                        <Zap size={16} />
                      </button>
                      <button
                        onClick={() => handleEditStage(stage)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Editar etapa"
                      >
                        <Settings size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteStageClick(stage)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Excluir etapa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Attached Forms */}
                  {stage.formAttachRules && stage.formAttachRules.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <FileText size={12} />
                        <span>Formulários vinculados:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {stage.formAttachRules.map((rule) => {
                          const formName = rule.formDefinition?.name || rule.externalFormName || 'Unknown';
                          const formVersion = rule.formDefinition?.version ?? rule.externalFormVersion;
                          return (
                            <div
                              key={rule.id}
                              className="flex items-center gap-2 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs"
                            >
                              <Link2 size={12} />
                              <span>{formName}{formVersion ? ` v${formVersion}` : ''}</span>
                              {rule.lockOnLeaveStage && (
                                <span className="text-purple-400" title="Bloqueia ao sair da etapa">🔒</span>
                              )}
                              <button
                                onClick={() => handleDetachForm(rule.id)}
                                className="ml-1 text-purple-400 hover:text-red-500"
                                title="Remover formulário"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Triggers */}
                  {stage.triggers && stage.triggers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <Zap size={12} />
                        <span>Gatilhos configurados:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {stage.triggers.map((trigger) => (
                          <div
                            key={trigger.id}
                            className="flex items-center gap-2 px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-xs group"
                          >
                            {trigger.eventType === 'CARD_MOVEMENT' ? (
                              <ArrowRight size={12} />
                            ) : (
                              <FileText size={12} />
                            )}
                            <span>{trigger.integration.name}</span>
                            {trigger.fromStage && (
                              <span className="text-amber-500" title={`De: ${trigger.fromStage.name}`}>
                                ← {trigger.fromStage.name}
                              </span>
                            )}
                            {trigger.conditions.length > 0 && (
                              <span className="bg-amber-200 text-amber-800 px-1 rounded" title="Condições">
                                {trigger.conditions.length}
                              </span>
                            )}
                            {!trigger.enabled && (
                              <span className="text-amber-400" title="Desabilitado">⏸</span>
                            )}
                            <button
                              onClick={() => handleDeleteTrigger(trigger.id)}
                              className="ml-1 text-amber-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remover gatilho"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
      )}

      {/* Flow Visualization Tab */}
      {activeTab === 'flow' && (
        <div className="flex-1 overflow-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Visualização do Fluxo</h3>

            {stages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <GitBranch size={48} className="mx-auto mb-3 text-gray-300" />
                <p>Adicione etapas para visualizar o fluxo</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Legend */}
                <div className="flex items-center gap-6 text-xs text-gray-500 border-b pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Etapa Inicial</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Etapa Final</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight size={14} className="text-gray-400" />
                    <span>Transição permitida</span>
                  </div>
                </div>

                {/* Flow Diagram */}
                <div className="relative">
                  {/* Stages as columns */}
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {stages
                      .sort((a, b) => a.stageOrder - b.stageOrder)
                      .map((stage, index) => (
                        <div
                          key={stage.id}
                          className="flex-shrink-0 w-48"
                        >
                          {/* Stage Node */}
                          <div
                            className={`relative p-4 rounded-lg border-2 ${
                              stage.isInitial
                                ? 'border-green-500 bg-green-50'
                                : stage.isFinal
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              <span className="font-medium text-gray-900 text-sm truncate">
                                {stage.name}
                              </span>
                            </div>

                            {stage.isInitial && (
                              <div className="flex items-center gap-1 text-xs text-green-600 mb-1">
                                <Play size={10} />
                                <span>Início</span>
                              </div>
                            )}
                            {stage.isFinal && (
                              <div className="flex items-center gap-1 text-xs text-blue-600 mb-1">
                                <Flag size={10} />
                                <span>Final</span>
                              </div>
                            )}

                            {/* Transitions from this stage */}
                            {stage.transitionsFrom && stage.transitionsFrom.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">Pode ir para:</p>
                                <div className="space-y-1">
                                  {stage.transitionsFrom.map((t) => (
                                    <div
                                      key={t.id}
                                      className="flex items-center gap-1 text-xs text-gray-700 bg-gray-100 rounded px-2 py-1"
                                    >
                                      <ArrowRight size={10} className="text-gray-400" />
                                      <span className="truncate">{t.toStage.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* No transitions warning */}
                            {(!stage.transitionsFrom || stage.transitionsFrom.length === 0) && !stage.isFinal && (
                              <div className="mt-3 pt-2 border-t border-gray-200">
                                <div className="flex items-center gap-1 text-xs text-amber-600">
                                  <AlertTriangle size={10} />
                                  <span>Sem transições</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Arrow to next */}
                          {index < stages.length - 1 && (
                            <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 text-gray-300">
                              <ArrowRight size={20} />
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Transition Matrix */}
                <div className="mt-8">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Matriz de Transições</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600">
                            De \ Para
                          </th>
                          {stages.map((s) => (
                            <th
                              key={s.id}
                              className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600"
                            >
                              <div className="flex items-center gap-1 justify-center">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: s.color }}
                                />
                                <span className="truncate max-w-[60px]">{s.name}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stages.map((fromStage) => (
                          <tr key={fromStage.id}>
                            <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700 bg-gray-50">
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: fromStage.color }}
                                />
                                <span className="truncate max-w-[80px]">{fromStage.name}</span>
                              </div>
                            </td>
                            {stages.map((toStage) => {
                              const hasTransition = fromStage.transitionsFrom?.some(
                                (t) => t.toStage.id === toStage.id
                              );
                              const isSame = fromStage.id === toStage.id;
                              return (
                                <td
                                  key={toStage.id}
                                  className={`border border-gray-200 px-3 py-2 text-center ${
                                    isSame
                                      ? 'bg-gray-100'
                                      : hasTransition
                                      ? 'bg-green-50'
                                      : ''
                                  }`}
                                >
                                  {isSame ? (
                                    <span className="text-gray-300">-</span>
                                  ) : hasTransition ? (
                                    <CheckCircle size={14} className="text-green-500 mx-auto" />
                                  ) : (
                                    <span className="text-gray-300">○</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Form Attachment Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title="Vincular Formulário"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600 space-y-1">
            <p>Etapa: <span className="font-semibold">{formStage?.name}</span></p>
            {pipeline?.projectName && (
              <p>Projeto: <span className="font-semibold text-purple-600">{pipeline.projectName}</span></p>
            )}
          </div>

          <div>
            <label className="label">Formulário</label>
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="input mt-1"
            >
              <option value="">Selecione um formulário...</option>
              {availableForms
                .filter((f) => !formStage?.formAttachRules?.some((r) => r.formDefinitionId === f.id))
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.version ? `(v${f.version})` : ''}
                  </option>
                ))}
            </select>
            {availableForms.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                {pipeline?.projectId
                  ? `Nenhum formulário publicado/aprovado encontrado para o projeto "${pipeline.projectName || pipeline.projectId}".`
                  : 'Nenhum formulário publicado disponível. Publique um formulário primeiro.'}
              </p>
            )}
          </div>

          <div>
            <label className="label">Status inicial do formulário</label>
            <select
              value={formSettings.defaultFormStatus}
              onChange={(e) => setFormSettings({ ...formSettings, defaultFormStatus: e.target.value })}
              className="input mt-1"
            >
              <option value="TO_FILL">A preencher</option>
              <option value="FILLED">Preenchido</option>
              <option value="APPROVED">Aprovado</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formSettings.lockOnLeaveStage}
                onChange={(e) => setFormSettings({ ...formSettings, lockOnLeaveStage: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Bloquear formulário ao sair da etapa</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              O formulário ficará somente leitura quando o card sair desta etapa.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowFormModal(false)} className="btn-secondary">
              Cancelar
            </button>
            <button
              onClick={handleAttachForm}
              disabled={savingForm || !selectedFormId}
              className="btn-primary"
            >
              {savingForm ? 'Vinculando...' : 'Vincular Formulário'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Trigger Configuration Modal */}
      <Modal
        isOpen={showTriggerModal}
        onClose={() => setShowTriggerModal(false)}
        title="Configurar Gatilho"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>Etapa: <span className="font-semibold">{triggerStage?.name}</span></p>
          </div>

          <div>
            <label className="label">Integração</label>
            <select
              value={triggerForm.integrationId}
              onChange={(e) => setTriggerForm({ ...triggerForm, integrationId: e.target.value })}
              className="input mt-1"
            >
              <option value="">Selecione uma integração...</option>
              {integrations
                .filter((i) => i.enabled)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
            </select>
            {integrations.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Nenhuma integração disponível. Crie uma integração primeiro.
              </p>
            )}
          </div>

          <div>
            <label className="label">Tipo de Evento</label>
            <select
              value={triggerForm.eventType}
              onChange={(e) => setTriggerForm({ ...triggerForm, eventType: e.target.value as TriggerEventType })}
              className="input mt-1"
            >
              <option value="CARD_MOVEMENT">Movimentação de Card</option>
              <option value="FORM_FIELD_CHANGE">Alteração de Campo</option>
            </select>
          </div>

          {triggerForm.eventType === 'CARD_MOVEMENT' && (
            <div>
              <label className="label">Da Etapa (opcional)</label>
              <select
                value={triggerForm.fromStageId}
                onChange={(e) => setTriggerForm({ ...triggerForm, fromStageId: e.target.value })}
                className="input mt-1"
              >
                <option value="">Qualquer etapa</option>
                {stages
                  .filter((s) => s.id !== triggerStage?.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Filtrar por etapa de origem da movimentação.
              </p>
            </div>
          )}

          {triggerForm.eventType === 'FORM_FIELD_CHANGE' && (
            <>
              <div>
                <label className="label">Formulário (opcional)</label>
                <select
                  value={triggerForm.formDefinitionId}
                  onChange={(e) => setTriggerForm({ ...triggerForm, formDefinitionId: e.target.value, fieldId: '' })}
                  className="input mt-1"
                >
                  <option value="">Qualquer formulário</option>
                  {availableForms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.version ? `(v${f.version})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Campo (opcional)</label>
                {(() => {
                  const selectedForm = availableForms.find(f => f.id === triggerForm.formDefinitionId);
                  const formFields = selectedForm?.schemaJson?.fields || selectedForm?.fields || [];

                  return formFields.length > 0 ? (
                    <select
                      value={triggerForm.fieldId}
                      onChange={(e) => setTriggerForm({ ...triggerForm, fieldId: e.target.value })}
                      className="input mt-1"
                    >
                      <option value="">Qualquer campo</option>
                      {formFields.map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.label || field.name || field.id}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={triggerForm.fieldId}
                      onChange={(e) => setTriggerForm({ ...triggerForm, fieldId: e.target.value })}
                      className="input mt-1"
                      placeholder="Ex: status, amount, approved"
                    />
                  );
                })()}
                <p className="text-xs text-gray-500 mt-1">
                  {triggerForm.formDefinitionId
                    ? 'Selecione o campo que dispara o gatilho.'
                    : 'Selecione um formulário para ver os campos disponíveis.'}
                </p>
              </div>
            </>
          )}

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Condições (opcional)</label>
              <button
                type="button"
                onClick={addCondition}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                + Adicionar Condição
              </button>
            </div>

            {triggerForm.conditions.length > 0 ? (
              <div className="space-y-2">
                {triggerForm.conditions.map((condition, index) => {
                  const selectedForm = availableForms.find(f => f.id === triggerForm.formDefinitionId);
                  const formFields = selectedForm?.schemaJson?.fields || selectedForm?.fields || [];

                  return (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      {formFields.length > 0 ? (
                        <select
                          value={condition.fieldPath}
                          onChange={(e) => updateCondition(index, 'fieldPath', e.target.value)}
                          className="input text-xs flex-1"
                        >
                          <option value="">Selecione um campo...</option>
                          {formFields.map((field) => (
                            <option key={field.id} value={field.id}>
                              {field.label || field.name || field.id}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={condition.fieldPath}
                          onChange={(e) => updateCondition(index, 'fieldPath', e.target.value)}
                          className="input text-xs flex-1"
                          placeholder="Campo (ex: status)"
                        />
                      )}
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                        className="input text-xs w-32"
                      >
                        <option value="EQUALS">=</option>
                        <option value="NOT_EQUALS">≠</option>
                        <option value="GREATER_THAN">&gt;</option>
                        <option value="LESS_THAN">&lt;</option>
                        <option value="GREATER_OR_EQUAL">≥</option>
                        <option value="LESS_OR_EQUAL">≤</option>
                        <option value="CONTAINS">contém</option>
                        <option value="NOT_CONTAINS">não contém</option>
                        <option value="IS_EMPTY">vazio</option>
                        <option value="IS_NOT_EMPTY">não vazio</option>
                      </select>
                      <input
                        type="text"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                        className="input text-xs flex-1"
                        placeholder="Valor"
                        disabled={condition.operator === 'IS_EMPTY' || condition.operator === 'IS_NOT_EMPTY'}
                      />
                      <button
                        type="button"
                        onClick={() => removeCondition(index)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500 p-2 bg-gray-50 rounded-lg">
                Sem condições. O gatilho será executado sempre que o evento ocorrer.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowTriggerModal(false)} className="btn-secondary">
              Cancelar
            </button>
            <button
              onClick={handleSaveTrigger}
              disabled={savingTrigger || !triggerForm.integrationId}
              className="btn-primary"
            >
              {savingTrigger ? 'Salvando...' : 'Adicionar Gatilho'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !publishing && !unpublishing && setShowConfirmModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${
                  confirmAction?.type === 'publish'
                    ? 'bg-blue-100'
                    : confirmAction?.type === 'unpublish'
                    ? 'bg-amber-100'
                    : 'bg-red-100'
                }`}>
                  {confirmAction?.type === 'publish' ? (
                    <CheckCircle2 size={24} className="text-blue-600" />
                  ) : confirmAction?.type === 'unpublish' ? (
                    <XCircle size={24} className="text-amber-600" />
                  ) : (
                    <AlertTriangle size={24} className="text-red-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {confirmAction?.type === 'publish'
                      ? 'Publicar Pipeline'
                      : confirmAction?.type === 'unpublish'
                      ? 'Despublicar Pipeline'
                      : confirmAction?.type === 'detachForm'
                      ? 'Desvincular Formulário'
                      : 'Excluir Etapa'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {confirmAction?.type === 'publish'
                      ? 'Esta versão ficará disponível para novos cards.'
                      : confirmAction?.type === 'unpublish'
                      ? 'Esta versão voltará para rascunho e não poderá receber novos cards até ser republicada.'
                      : confirmAction?.type === 'detachForm'
                      ? 'Tem certeza que deseja remover este formulário da etapa?'
                      : `Tem certeza que deseja excluir "${confirmAction?.data?.name}"?`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={publishing || unpublishing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmAction?.type === 'publish') {
                    handlePublish();
                  } else if (confirmAction?.type === 'unpublish') {
                    handleUnpublish();
                  } else if (confirmAction?.type === 'deleteStage') {
                    handleDeleteStage(confirmAction.data.id);
                  } else if (confirmAction?.type === 'detachForm') {
                    executeDetachForm(confirmAction.data.ruleId);
                  }
                }}
                disabled={publishing || unpublishing}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  confirmAction?.type === 'publish'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : confirmAction?.type === 'unpublish'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {(publishing || unpublishing) && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {confirmAction?.type === 'publish'
                  ? publishing ? 'Publicando...' : 'Publicar'
                  : confirmAction?.type === 'unpublish'
                  ? unpublishing ? 'Despublicando...' : 'Despublicar'
                  : confirmAction?.type === 'detachForm'
                  ? 'Desvincular'
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
