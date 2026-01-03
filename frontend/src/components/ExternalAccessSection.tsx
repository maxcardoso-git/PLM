import { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Shield,
} from 'lucide-react';
import api from '../services/api';
import type { PlmApiKey, PlmApiKeyPermission } from '../types';

const PERMISSION_LABELS: Record<PlmApiKeyPermission, string> = {
  'cards:create': 'Criar Cards',
  'cards:read': 'Ler Cards',
  'cards:update': 'Atualizar Cards',
  'cards:move': 'Mover Cards',
  'forms:update': 'Atualizar Formulários',
  'conversations:write': 'Gerenciar Conversas',
};

const ALL_PERMISSIONS: PlmApiKeyPermission[] = [
  'cards:create',
  'cards:read',
  'cards:update',
  'cards:move',
  'forms:update',
  'conversations:write',
];

export function ExternalAccessSection() {
  const [apiKeys, setApiKeys] = useState<PlmApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyVisible, setNewKeyVisible] = useState<{ id: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    permissions: [] as PlmApiKeyPermission[],
    expiresAt: '',
  });
  const [creating, setCreating] = useState(false);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getPlmApiKeys();
      setApiKeys(response.items || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar API Keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleCreate = async () => {
    if (!createForm.name || createForm.permissions.length === 0) {
      return;
    }

    try {
      setCreating(true);
      const newKey = await api.createPlmApiKey({
        name: createForm.name,
        description: createForm.description || undefined,
        permissions: createForm.permissions,
        expiresAt: createForm.expiresAt || undefined,
      });

      // Show the new key
      if (newKey.key) {
        setNewKeyVisible({ id: newKey.id, key: newKey.key });
      }

      // Reset form and close modal
      setCreateForm({ name: '', description: '', permissions: [], expiresAt: '' });
      setShowCreateModal(false);
      fetchApiKeys();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar API Key');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta API Key? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await api.deletePlmApiKey(id);
      fetchApiKeys();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir API Key');
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await api.updatePlmApiKey(id, { enabled: !enabled });
      fetchApiKeys();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar API Key');
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePermission = (permission: PlmApiKeyPermission) => {
    setCreateForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 16) return key;
    return `${key.substring(0, 12)}...${key.substring(key.length - 4)}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="mt-6 bg-white rounded-lg shadow border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Key className="text-indigo-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Acesso Externo (API)</h2>
              <p className="text-sm text-gray-500">
                Gerencie chaves de API para integrações externas com o PLM
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus size={16} />
            Nova API Key
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* New key notification */}
        {newKeyVisible && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-800">
                API Key criada com sucesso! Copie agora - ela não será exibida novamente.
              </span>
              <button
                onClick={() => setNewKeyVisible(null)}
                className="text-green-600 hover:text-green-800"
              >
                &times;
              </button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-white rounded border border-green-300 text-sm font-mono">
                {newKeyVisible.key}
              </code>
              <button
                onClick={() => handleCopyKey(newKeyVisible.key)}
                className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* API Keys list */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="animate-spin text-gray-400" size={24} />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Key className="mx-auto mb-2 text-gray-300" size={40} />
            <p>Nenhuma API Key criada</p>
            <p className="text-sm">Crie uma API Key para permitir integrações externas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className={`border rounded-lg p-4 ${
                  apiKey.enabled ? 'border-gray-200' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        apiKey.enabled ? 'bg-indigo-100' : 'bg-gray-200'
                      }`}
                    >
                      <Key
                        className={apiKey.enabled ? 'text-indigo-600' : 'text-gray-400'}
                        size={16}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{apiKey.name}</span>
                        {!apiKey.enabled && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                            Desabilitada
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                          {maskApiKey(apiKey.key || '')}
                        </code>
                        {apiKey.key && (
                          <button
                            onClick={() => handleCopyKey(apiKey.key!)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={apiKey.enabled}
                        onChange={() => handleToggleEnabled(apiKey.id, apiKey.enabled)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                    <button
                      onClick={() => handleDelete(apiKey.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Permissions and metadata */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {apiKey.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded"
                    >
                      {PERMISSION_LABELS[perm] || perm}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Criada: {formatDate(apiKey.createdAt)}
                  </span>
                  {apiKey.lastUsedAt && (
                    <span className="flex items-center gap-1">
                      <RefreshCw size={12} />
                      Ultimo uso: {formatDate(apiKey.lastUsedAt)}
                    </span>
                  )}
                  {apiKey.expiresAt && (
                    <span className="flex items-center gap-1">
                      <AlertCircle size={12} />
                      Expira: {formatDate(apiKey.expiresAt)}
                    </span>
                  )}
                </div>

                {apiKey.description && (
                  <p className="mt-2 text-sm text-gray-500">{apiKey.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Documentation toggle */}
        <div className="mt-6 border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowDocs(!showDocs)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <ExternalLink size={16} />
            Documentacao da API
            {showDocs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showDocs && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
              <h4 className="font-medium text-gray-900 mb-3">Endpoints Disponíveis</h4>

              <div className="space-y-4">
                <div className="p-3 bg-white rounded border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                      POST
                    </span>
                    <code className="text-sm">/api/v1/external/cards</code>
                  </div>
                  <p className="text-gray-600 text-xs">Criar um novo card</p>
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
                    {`{
  "pipelineKey": "VENDAS",
  "sessionId": "session_abc123",
  "title": "Novo Lead",
  "description": "...",
  "priority": "medium",
  "formData": { "form-key": { "campo": "valor" } }
}`}
                  </div>
                </div>

                <div className="p-3 bg-white rounded border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      GET
                    </span>
                    <code className="text-sm">/api/v1/external/cards/:identifier</code>
                  </div>
                  <p className="text-gray-600 text-xs">
                    Buscar card por ID ou sessionId (query: type=cardId|sessionId)
                  </p>
                </div>

                <div className="p-3 bg-white rounded border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                      PATCH
                    </span>
                    <code className="text-sm">/api/v1/external/cards/:identifier</code>
                  </div>
                  <p className="text-gray-600 text-xs">Atualizar dados do card</p>
                </div>

                <div className="p-3 bg-white rounded border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                      PATCH
                    </span>
                    <code className="text-sm">/api/v1/external/cards/:identifier/forms/:formId</code>
                  </div>
                  <p className="text-gray-600 text-xs">Atualizar dados de um formulário</p>
                </div>

                <div className="p-3 bg-white rounded border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                      POST
                    </span>
                    <code className="text-sm">/api/v1/external/cards/:identifier/move</code>
                  </div>
                  <p className="text-gray-600 text-xs">Mover card para outro estágio</p>
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
                    {`{ "toStageKey": "QUALIFICADO", "comment": "..." }`}
                  </div>
                </div>

                {/* Conversations API */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-3">API de Conversas</h5>

                  <div className="space-y-4">
                    <div className="p-3 bg-white rounded border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                          POST
                        </span>
                        <code className="text-sm">/api/v1/external/conversations</code>
                      </div>
                      <p className="text-gray-600 text-xs">Criar nova sessão de conversa</p>
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                        {`{
  "cardIdentifier": "session_abc123",
  "identifierType": "sessionId",
  "externalId": "conv_12345",
  "channel": "WHATSAPP",
  "participants": [
    { "type": "CLIENT", "name": "João", "externalId": "+5511..." },
    { "type": "AGENT", "name": "Bot", "externalId": "bot_1" }
  ],
  "startedAt": "2026-01-03T10:00:00Z",
  "metadata": { "queue": "vendas" }
}`}
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                          POST
                        </span>
                        <code className="text-sm">/api/v1/external/conversations/:externalId/messages</code>
                      </div>
                      <p className="text-gray-600 text-xs">Adicionar mensagens a uma conversa</p>
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                        {`{
  "messages": [
    {
      "senderType": "CLIENT",
      "senderName": "João",
      "senderId": "+5511...",
      "content": "Olá!",
      "contentType": "text",
      "sentAt": "2026-01-03T10:00:05Z"
    }
  ]
}`}
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                          PATCH
                        </span>
                        <code className="text-sm">/api/v1/external/conversations/:externalId</code>
                      </div>
                      <p className="text-gray-600 text-xs">Atualizar/encerrar conversa</p>
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                        {`{
  "status": "CLOSED",
  "endedAt": "2026-01-03T10:30:00Z",
  "summary": "Cliente solicitou informações..."
}`}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                    <strong>Canais:</strong> WHATSAPP, WEBCHAT, PHONE, EMAIL, OTHER<br/>
                    <strong>Status:</strong> ACTIVE, CLOSED, ABANDONED, TRANSFERRED<br/>
                    <strong>Tipos de participante:</strong> CLIENT, AGENT, OPERATOR
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-indigo-50 rounded border border-indigo-100">
                <div className="flex items-center gap-2 text-indigo-800 font-medium mb-2">
                  <Shield size={16} />
                  Autenticação
                </div>
                <p className="text-indigo-700 text-xs">
                  Inclua o header <code className="bg-white px-1 py-0.5 rounded">X-API-Key</code>{' '}
                  com sua API Key em todas as requisições.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Nova API Key</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Integração Flow"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Descreva o uso desta API Key..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissões *
                </label>
                <div className="space-y-2">
                  {ALL_PERMISSIONS.map((perm) => (
                    <label
                      key={perm}
                      className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={createForm.permissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{PERMISSION_LABELS[perm]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Expiração (opcional)
                </label>
                <input
                  type="date"
                  value={createForm.expiresAt}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, expiresAt: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createForm.name || createForm.permissions.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Criando...' : 'Criar API Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
