import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, FileText, Trash2, AlertTriangle, Calendar, Zap, ChevronDown, ChevronUp, Save, Loader2, CheckCircle, XCircle, Eye, MessageSquare, Send, Key, Edit3, FlaskConical } from 'lucide-react';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useSettings } from '../context/SettingsContext';
import { KanbanBoard } from '../components/kanban';
import { Modal } from '../components/ui';
import type { KanbanBoard as KanbanBoardType, KanbanCard, CardFull, KanbanStage } from '../types';

export function PipelineKanbanPage() {
  const { pipelineId } = useParams<{ pipelineId: string }>();
  const { organization } = useTenant();
  const { settings } = useSettings();
  const [board, setBoard] = useState<KanbanBoardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Card detail modal
  const [selectedCard, setSelectedCard] = useState<CardFull | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);

  // Create card modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStageId, setCreateStageId] = useState<string | null>(null);
  const [createStage, setCreateStage] = useState<KanbanStage | null>(null);
  const [newCard, setNewCard] = useState({ title: '', description: '', priority: 'medium' });
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});
  const [creating, setCreating] = useState(false);

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // External form state
  const [expandedExternalForm, setExpandedExternalForm] = useState<string | null>(null);
  const [externalFormSchema, setExternalFormSchema] = useState<any>(null);
  const [externalFormData, setExternalFormData] = useState<Record<string, any>>({});
  const [loadingExternalForm, setLoadingExternalForm] = useState(false);
  const [savingExternalForm, setSavingExternalForm] = useState(false);

  // Execution details state
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);

  // Comments state
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Unique key value state
  const [editingUniqueKey, setEditingUniqueKey] = useState(false);
  const [uniqueKeyValue, setUniqueKeyValue] = useState('');
  const [savingUniqueKey, setSavingUniqueKey] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

  const fetchBoard = useCallback(async () => {
    if (!pipelineId || !organization) return;

    try {
      const data = await api.getKanbanBoard(pipelineId);
      setBoard(data);
    } catch (error) {
      console.error('Failed to fetch kanban board:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pipelineId, organization]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBoard();
  };

  const handleCardClick = async (card: KanbanCard) => {
    setLoadingCard(true);
    setExpandedExecution(null);
    setNewComment('');
    setEditingUniqueKey(false);
    try {
      const fullCard = await api.getCard(card.id);
      setSelectedCard(fullCard);
      setUniqueKeyValue(fullCard.card.uniqueKeyValue || '');
    } catch (error) {
      console.error('Failed to fetch card details:', error);
    } finally {
      setLoadingCard(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!selectedCard || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await api.createCardComment(selectedCard.card.id, {
        content: newComment.trim(),
        userName: 'Usuário', // TODO: Get from auth context
      });

      // Refresh card to get updated comments
      const fullCard = await api.getCard(selectedCard.card.id);
      setSelectedCard(fullCard);
      setNewComment('');
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSaveUniqueKey = async () => {
    if (!selectedCard) return;

    setSavingUniqueKey(true);
    try {
      const updatedCard = await api.updateCard(selectedCard.card.id, {
        uniqueKeyValue: uniqueKeyValue.trim() || undefined,
      });
      setSelectedCard(updatedCard);
      setEditingUniqueKey(false);
    } catch (error) {
      console.error('Failed to save unique key:', error);
    } finally {
      setSavingUniqueKey(false);
    }
  };

  const handleAddCard = (stageId: string) => {
    // Find the stage in the board to get form attach rules
    const stage = board?.stages.find(s => s.id === stageId);
    setCreateStageId(stageId);
    setCreateStage(stage || null);
    setFormData({});
    setShowCreateModal(true);
  };

  const handleCreateCard = async (e: FormEvent) => {
    e.preventDefault();
    if (!pipelineId || !newCard.title) return;

    setCreating(true);
    try {
      // Build forms array with data
      const forms = createStage?.formAttachRules
        ?.filter(rule => rule.formDefinitionId)
        .map(rule => ({
          formDefinitionId: rule.formDefinitionId!,
          status: 'FILLED' as const,
          data: formData[rule.formDefinitionId!] || {},
        })) || [];

      await api.createCard({
        pipelineId,
        initialStageId: createStageId || undefined,
        title: newCard.title,
        description: newCard.description,
        priority: newCard.priority,
        forms: forms.length > 0 ? forms : undefined,
      });
      setShowCreateModal(false);
      setNewCard({ title: '', description: '', priority: 'medium' });
      setCreateStageId(null);
      setCreateStage(null);
      setFormData({});
      fetchBoard();
    } catch (error) {
      console.error('Failed to create card:', error);
    } finally {
      setCreating(false);
    }
  };

  const fetchExternalFormSchema = async (formId: string, uniqueKeyFieldId?: string) => {
    if (!settings.externalForms.baseUrl || !settings.externalForms.apiKey) {
      console.error('External forms not configured');
      return;
    }

    setLoadingExternalForm(true);
    setExternalFormSchema(null);
    setExternalFormData({});

    try {
      // Fetch schema
      const response = await fetch(`${API_BASE_URL}/external-forms/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: settings.externalForms.baseUrl,
          endpoint: `/data-entry-forms/external/${formId}/schema`,
          apiKey: settings.externalForms.apiKey,
          method: 'GET',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch form schema');
      }

      const data = await response.json();

      // Normalize schema structure
      let schema = data.schema || data.data || data.form || data;
      if (!schema.fields) {
        schema.fields = data.fields || schema.formFields || [];
        if (schema.sections) {
          schema.fields = schema.sections.flatMap((s: any) => s.fields || []);
        }
      }

      setExternalFormSchema(schema);

      // If card has a unique key value, try to fetch existing form data
      if (selectedCard?.card.uniqueKeyValue && uniqueKeyFieldId) {
        try {
          const dataResponse = await fetch(`${API_BASE_URL}/external-forms/proxy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              baseUrl: settings.externalForms.baseUrl,
              endpoint: `/data-entry-forms/external/${formId}/data`,
              apiKey: settings.externalForms.apiKey,
              method: 'POST',
              body: {
                keyField: uniqueKeyFieldId,
                keyValue: selectedCard.card.uniqueKeyValue,
              },
            }),
          });

          if (dataResponse.ok) {
            const formData = await dataResponse.json();
            // Normalize the form data structure
            const existingData = formData.data || formData.record || formData;
            if (existingData && typeof existingData === 'object') {
              setExternalFormData(existingData);
            }
          }
        } catch (dataError) {
          console.log('No existing form data found for unique key:', dataError);
          // It's OK if no data exists - just leave the form empty
        }
      }
    } catch (error) {
      console.error('Failed to fetch external form schema:', error);
    } finally {
      setLoadingExternalForm(false);
    }
  };

  const handleExpandExternalForm = (formId: string, uniqueKeyFieldId?: string) => {
    if (expandedExternalForm === formId) {
      setExpandedExternalForm(null);
      setExternalFormSchema(null);
      setExternalFormData({});
    } else {
      setExpandedExternalForm(formId);
      fetchExternalFormSchema(formId, uniqueKeyFieldId);
    }
  };

  const handleSaveExternalForm = async (formId: string) => {
    if (!settings.externalForms.baseUrl || !settings.externalForms.apiKey || !selectedCard) {
      return;
    }

    setSavingExternalForm(true);
    try {
      // Submit form data to external API
      await fetch(`${API_BASE_URL}/external-forms/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: settings.externalForms.baseUrl,
          endpoint: `/data-entry-forms/external/${formId}/submit`,
          apiKey: settings.externalForms.apiKey,
          method: 'POST',
          payload: {
            cardId: selectedCard.card.id,
            data: externalFormData,
          },
        }),
      });

      // Collapse the form after save
      setExpandedExternalForm(null);
      setExternalFormSchema(null);
      setExternalFormData({});

      // Refresh the card
      const fullCard = await api.getCard(selectedCard.card.id);
      setSelectedCard(fullCard);
    } catch (error) {
      console.error('Failed to save external form:', error);
    } finally {
      setSavingExternalForm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Pipeline not found or not published</p>
        <Link to="/pipelines" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Pipelines
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link
            to="/pipelines"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{board.pipeline.name}</h1>
            <p className="text-sm text-gray-500">
              {board.pipeline.key} | v{board.pipeline.publishedVersion}
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary"
        >
          <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Test Mode Banner */}
      {board.pipeline.versionStatus === 'test' && (
        <div className="mb-4 p-3 bg-purple-100 border border-purple-300 rounded-lg flex items-center gap-3">
          <FlaskConical size={20} className="text-purple-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-purple-900">Modo de Teste</p>
            <p className="text-xs text-purple-700">
              Este é um ambiente de teste. Os cards criados aqui serão removidos quando o teste for finalizado.
            </p>
          </div>
          <Link
            to={`/pipelines/${pipelineId}/edit`}
            className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-200 rounded-lg hover:bg-purple-300 transition-colors"
          >
            Gerenciar Teste
          </Link>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          board={board}
          onRefresh={fetchBoard}
          onCardClick={handleCardClick}
          onAddCard={handleAddCard}
        />
      </div>

      {/* Create Card Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateStageId(null);
          setCreateStage(null);
          setFormData({});
        }}
        title={`Criar Card${createStage ? ` - ${createStage.name}` : ''}`}
      >
        <form onSubmit={handleCreateCard} className="space-y-4">
          <div>
            <label className="label">Título</label>
            <input
              type="text"
              value={newCard.title}
              onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
              className="input mt-1"
              placeholder="Título do card..."
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Descrição</label>
            <textarea
              value={newCard.description}
              onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
              className="input mt-1"
              rows={3}
              placeholder="Descrição opcional..."
            />
          </div>

          <div>
            <label className="label">Prioridade</label>
            <select
              value={newCard.priority}
              onChange={(e) => setNewCard({ ...newCard, priority: e.target.value })}
              className="input mt-1"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          {/* Forms attached to this stage */}
          {createStage?.formAttachRules && createStage.formAttachRules.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText size={18} />
                Formulários
              </h4>
              <div className="space-y-4">
                {createStage.formAttachRules.map((rule) => {
                  const formDef = rule.formDefinition;
                  const formName = formDef?.name || rule.externalFormName || 'Formulário';
                  const fields = formDef?.schemaJson?.fields || [];

                  return (
                    <div key={rule.id} className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-800 mb-3">
                        {formName}
                        {formDef?.version && <span className="text-xs text-gray-500 ml-2">v{formDef.version}</span>}
                      </h5>

                      {fields.length > 0 ? (
                        <div className="space-y-3">
                          {fields.map((field: any) => (
                            <div key={field.id || field.key}>
                              <label className="text-sm text-gray-600 mb-1 block">
                                {field.label || field.name || field.id}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              {field.type === 'textarea' ? (
                                <textarea
                                  value={formData[rule.formDefinitionId!]?.[field.id] || ''}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    [rule.formDefinitionId!]: {
                                      ...prev[rule.formDefinitionId!],
                                      [field.id]: e.target.value
                                    }
                                  }))}
                                  className="input text-sm"
                                  rows={2}
                                  placeholder={field.placeholder || ''}
                                />
                              ) : field.type === 'select' ? (
                                <select
                                  value={formData[rule.formDefinitionId!]?.[field.id] || ''}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    [rule.formDefinitionId!]: {
                                      ...prev[rule.formDefinitionId!],
                                      [field.id]: e.target.value
                                    }
                                  }))}
                                  className="input text-sm"
                                >
                                  <option value="">Selecione...</option>
                                  {field.options?.map((opt: any) => (
                                    <option key={opt.value || opt} value={opt.value || opt}>
                                      {opt.label || opt}
                                    </option>
                                  ))}
                                </select>
                              ) : field.type === 'checkbox' ? (
                                <input
                                  type="checkbox"
                                  checked={formData[rule.formDefinitionId!]?.[field.id] || false}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    [rule.formDefinitionId!]: {
                                      ...prev[rule.formDefinitionId!],
                                      [field.id]: e.target.checked
                                    }
                                  }))}
                                  className="h-4 w-4 text-blue-600"
                                />
                              ) : (
                                <input
                                  type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                                  value={formData[rule.formDefinitionId!]?.[field.id] || ''}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    [rule.formDefinitionId!]: {
                                      ...prev[rule.formDefinitionId!],
                                      [field.id]: e.target.value
                                    }
                                  }))}
                                  className="input text-sm"
                                  placeholder={field.placeholder || ''}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : rule.externalFormId ? (
                        <p className="text-sm text-gray-500 italic">
                          Formulário externo - preencha após criar o card
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          Nenhum campo definido
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setCreateStageId(null);
                setCreateStage(null);
                setFormData({});
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating || !newCard.title}
              className="btn-primary"
            >
              {creating ? 'Criando...' : 'Criar Card'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Card Detail Modal */}
      <Modal
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        title={selectedCard?.card.title || 'Card Details'}
        size="xl"
      >
        {loadingCard ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : selectedCard ? (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {/* Card Info */}
            <div>
              <p className="text-gray-600">{selectedCard.card.description || 'Sem descrição'}</p>
              <div className="flex gap-4 mt-3 text-sm text-gray-500 flex-wrap">
                <span>Prioridade: <span className="font-medium capitalize">{selectedCard.card.priority}</span></span>
                <span>Status: <span className="font-medium">{selectedCard.card.status}</span></span>
                <span>Estágio: <span className="font-medium">{selectedCard.card.currentStage.name}</span></span>
              </div>

              {/* Dates */}
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  Criado: {new Date(selectedCard.card.createdAt).toLocaleString('pt-BR')}
                </span>
                {selectedCard.card.updatedAt && selectedCard.card.updatedAt !== selectedCard.card.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    Atualizado: {new Date(selectedCard.card.updatedAt).toLocaleString('pt-BR')}
                  </span>
                )}
              </div>

              {/* Unique Key Value - only show if stage has external forms configured */}
              {(() => {
                const currentStage = board?.stages.find(s => s.id === selectedCard.card.currentStageId);
                const hasExternalForms = currentStage?.formAttachRules?.some(r => r.externalFormId);
                if (!hasExternalForms) return null;

                return (
                  <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-indigo-900 flex items-center gap-2">
                        <Key size={14} />
                        Chave Única (para buscar dados externos)
                      </label>
                      {!editingUniqueKey && (
                        <button
                          onClick={() => setEditingUniqueKey(true)}
                          className="text-indigo-600 hover:text-indigo-800 p-1"
                          title="Editar"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                    </div>
                    {editingUniqueKey ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={uniqueKeyValue}
                          onChange={(e) => setUniqueKeyValue(e.target.value)}
                          className="input text-sm flex-1"
                          placeholder="Ex: CPF, CNPJ, ID do cliente..."
                          autoFocus
                        />
                        <button
                          onClick={handleSaveUniqueKey}
                          disabled={savingUniqueKey}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 text-sm"
                        >
                          {savingUniqueKey ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}
                          Salvar
                        </button>
                        <button
                          onClick={() => {
                            setEditingUniqueKey(false);
                            setUniqueKeyValue(selectedCard.card.uniqueKeyValue || '');
                          }}
                          className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-indigo-700">
                        {selectedCard.card.uniqueKeyValue || (
                          <span className="text-indigo-400 italic">Não definido - clique em editar para configurar</span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Integration Info */}
            {(() => {
              const currentStage = board?.stages.find(s => s.id === selectedCard.card.currentStageId);
              if (!currentStage?.hasTriggers) return null;

              return (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <Zap size={16} className="text-purple-600" />
                    Integrações Configuradas
                  </h4>
                  <div className="space-y-1">
                    {currentStage.triggers.map((trigger) => (
                      <div key={trigger.id} className="text-sm text-purple-700">
                        • {trigger.integrationName}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Trigger Executions */}
            {selectedCard.triggerExecutions && selectedCard.triggerExecutions.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Zap size={16} />
                  Execuções de Integração ({selectedCard.triggerExecutions.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedCard.triggerExecutions.map((exec) => (
                    <div
                      key={exec.id}
                      className={`rounded-lg border overflow-hidden ${
                        exec.status === 'SUCCESS' ? 'bg-green-50 border-green-200' :
                        exec.status === 'FAILURE' ? 'bg-red-50 border-red-200' :
                        'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:opacity-80"
                        onClick={() => setExpandedExecution(expandedExecution === exec.id ? null : exec.id)}
                      >
                        <div className="flex items-center gap-3">
                          {exec.status === 'SUCCESS' && <CheckCircle size={18} className="text-green-600" />}
                          {exec.status === 'FAILURE' && <XCircle size={18} className="text-red-600" />}
                          {exec.status === 'PENDING' && <Loader2 size={18} className="text-amber-600 animate-spin" />}
                          <div>
                            <span className="font-medium text-gray-900">{exec.integrationName}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {new Date(exec.executedAt).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            exec.status === 'SUCCESS' ? 'bg-green-200 text-green-800' :
                            exec.status === 'FAILURE' ? 'bg-red-200 text-red-800' :
                            'bg-amber-200 text-amber-800'
                          }`}>
                            {exec.status === 'SUCCESS' ? 'Sucesso' :
                             exec.status === 'FAILURE' ? 'Erro' : 'Pendente'}
                          </span>
                          <Eye size={16} className="text-gray-400" />
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedExecution === exec.id && (
                        <div className="border-t p-3 bg-white">
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-500">Integração:</span>{' '}
                              <span className="font-medium">{exec.integrationName}</span>
                              <span className="text-gray-400 ml-1">({exec.integrationKey})</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Evento:</span>{' '}
                              <span className="font-medium">
                                {exec.eventType === 'CARD_MOVEMENT' ? 'Movimentação de Card' : 'Alteração de Campo'}
                              </span>
                            </div>
                            {exec.stageName && (
                              <div>
                                <span className="text-gray-500">Estágio:</span>{' '}
                                <span className="font-medium">{exec.stageName}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-500">Executado em:</span>{' '}
                              <span className="font-medium">{new Date(exec.executedAt).toLocaleString('pt-BR')}</span>
                            </div>
                            {exec.completedAt && (
                              <div>
                                <span className="text-gray-500">Finalizado em:</span>{' '}
                                <span className="font-medium">{new Date(exec.completedAt).toLocaleString('pt-BR')}</span>
                              </div>
                            )}
                            {exec.errorMessage && (
                              <div className="mt-2 p-2 bg-red-100 rounded text-red-700">
                                <span className="font-medium">Erro:</span> {exec.errorMessage}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Forms */}
            <div>
              {(() => {
                // Get forms from the current stage
                const currentStage = board?.stages.find(s => s.id === selectedCard.card.currentStageId);
                const externalForms = currentStage?.formAttachRules?.filter(r => r.externalFormId) || [];
                const totalForms = selectedCard.forms.length + externalForms.length;

                return (
                  <>
                    <h4 className="font-semibold text-gray-900 mb-2">Formulários ({totalForms})</h4>
                    <div className="space-y-2">
                      {/* Local forms */}
                      {selectedCard.forms.map((form) => (
                        <div
                          key={form.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <span className="font-medium">{form.formDefinition?.name || 'Formulário'}</span>
                            <span className="text-xs text-gray-500 ml-2">v{form.formVersion}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            form.status === 'FILLED' ? 'bg-green-100 text-green-700' :
                            form.status === 'LOCKED' ? 'bg-gray-100 text-gray-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {form.status}
                          </span>
                        </div>
                      ))}
                      {/* External forms */}
                      {externalForms.map((rule) => (
                        <div key={rule.id} className="bg-blue-50 rounded-lg border border-blue-200 overflow-hidden">
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-100"
                            onClick={() => handleExpandExternalForm(rule.externalFormId!, rule.uniqueKeyFieldId)}
                          >
                            <div className="flex items-center gap-2">
                              <FileText size={16} className="text-blue-600" />
                              <span className="font-medium">{rule.externalFormName || 'Formulário Externo'}</span>
                              <span className="text-xs text-blue-500">(externo)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-blue-600">
                                {expandedExternalForm === rule.externalFormId ? 'Fechar' : 'Preencher'}
                              </span>
                              {expandedExternalForm === rule.externalFormId ? (
                                <ChevronUp size={16} className="text-blue-600" />
                              ) : (
                                <ChevronDown size={16} className="text-blue-600" />
                              )}
                            </div>
                          </div>

                          {/* Expanded form content */}
                          {expandedExternalForm === rule.externalFormId && (
                            <div className="border-t border-blue-200 p-4 bg-white">
                              {loadingExternalForm ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 size={24} className="animate-spin text-blue-600" />
                                </div>
                              ) : externalFormSchema?.fields?.length > 0 ? (
                                <div className="space-y-4">
                                  {externalFormSchema.fields.map((field: any) => (
                                    <div key={field.id || field.key}>
                                      <label className="text-sm text-gray-700 mb-1 block font-medium">
                                        {field.label || field.name || field.id}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                      </label>
                                      {field.type === 'textarea' ? (
                                        <textarea
                                          value={externalFormData[field.id] || ''}
                                          onChange={(e) => setExternalFormData(prev => ({
                                            ...prev,
                                            [field.id]: e.target.value
                                          }))}
                                          className="input text-sm w-full"
                                          rows={3}
                                          placeholder={field.placeholder || ''}
                                        />
                                      ) : field.type === 'select' ? (
                                        <select
                                          value={externalFormData[field.id] || ''}
                                          onChange={(e) => setExternalFormData(prev => ({
                                            ...prev,
                                            [field.id]: e.target.value
                                          }))}
                                          className="input text-sm w-full"
                                        >
                                          <option value="">Selecione...</option>
                                          {field.options?.map((opt: any) => (
                                            <option key={opt.value || opt} value={opt.value || opt}>
                                              {opt.label || opt}
                                            </option>
                                          ))}
                                        </select>
                                      ) : field.type === 'checkbox' || field.type === 'boolean' ? (
                                        <input
                                          type="checkbox"
                                          checked={externalFormData[field.id] || false}
                                          onChange={(e) => setExternalFormData(prev => ({
                                            ...prev,
                                            [field.id]: e.target.checked
                                          }))}
                                          className="h-4 w-4 text-blue-600"
                                        />
                                      ) : (
                                        <input
                                          type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
                                          value={externalFormData[field.id] || ''}
                                          onChange={(e) => setExternalFormData(prev => ({
                                            ...prev,
                                            [field.id]: e.target.value
                                          }))}
                                          className="input text-sm w-full"
                                          placeholder={field.placeholder || ''}
                                        />
                                      )}
                                    </div>
                                  ))}

                                  <div className="flex justify-end pt-2">
                                    <button
                                      onClick={() => handleSaveExternalForm(rule.externalFormId!)}
                                      disabled={savingExternalForm}
                                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      {savingExternalForm ? (
                                        <>
                                          <Loader2 size={16} className="animate-spin" />
                                          Salvando...
                                        </>
                                      ) : (
                                        <>
                                          <Save size={16} />
                                          Salvar
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 italic py-4 text-center">
                                  {externalFormSchema ? 'Nenhum campo definido neste formulário' : 'Erro ao carregar formulário'}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {totalForms === 0 && (
                        <p className="text-sm text-gray-500 italic">Nenhum formulário vinculado</p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Allowed Transitions */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Move to</h4>
              <div className="flex flex-wrap gap-2">
                {selectedCard.allowedTransitions.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={async () => {
                      await api.moveCard(selectedCard.card.id, stage.id, 'manual');
                      setSelectedCard(null);
                      fetchBoard();
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border-2 hover:opacity-80 transition-opacity"
                    style={{ borderColor: stage.color, color: stage.color }}
                  >
                    {stage.name}
                  </button>
                ))}
                {selectedCard.allowedTransitions.length === 0 && (
                  <span className="text-gray-500 text-sm">No transitions available</span>
                )}
              </div>
            </div>

            {/* History */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Histórico ({selectedCard.history.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedCard.history.map((move) => (
                  <div key={move.id} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: move.fromStage?.color }}
                    />
                    <span className="text-gray-600">{move.fromStage?.name}</span>
                    <span className="text-gray-400">→</span>
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: move.toStage?.color }}
                    />
                    <span className="text-gray-600">{move.toStage?.name}</span>
                    <span className="text-gray-400 ml-auto text-xs">
                      {new Date(move.movedAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <MessageSquare size={16} />
                Comentários ({selectedCard.comments?.length || 0})
              </h4>

              {/* Add comment input */}
              <div className="flex gap-2 mb-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Adicionar um comentário..."
                  className="input flex-1 text-sm resize-none"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleSubmitComment();
                    }
                  }}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={submittingComment || !newComment.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed self-end"
                  title="Enviar (Ctrl+Enter)"
                >
                  {submittingComment ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>

              {/* Comments list */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {selectedCard.comments && selectedCard.comments.length > 0 ? (
                  selectedCard.comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 text-sm">{comment.userName}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic text-center py-4">Nenhum comentário ainda</p>
                )}
              </div>
            </div>

            {/* Delete Card */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm"
              >
                <Trash2 size={16} />
                Excluir Card
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal && !!selectedCard}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-gray-900 font-medium">
                Excluir "{selectedCard?.card.title}"?
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Esta ação não pode ser desfeita. O card e todo seu histórico serão removidos permanentemente.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={async () => {
                if (!selectedCard) return;
                setDeleting(true);
                try {
                  await api.deleteCard(selectedCard.card.id);
                  setShowDeleteModal(false);
                  setSelectedCard(null);
                  fetchBoard();
                } catch (error) {
                  console.error('Failed to delete card:', error);
                  alert('Erro ao excluir card');
                } finally {
                  setDeleting(false);
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Excluir Card
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
