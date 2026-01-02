import { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Loader2,
  Users,
  Eye,
  Edit3,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { api } from '../../services/api';
import type { PipelinePermission, PipelineRole } from '../../types';

interface PermissionsPanelProps {
  pipelineId: string;
}

const ROLE_OPTIONS: { value: PipelineRole; label: string; description: string; icon: typeof Eye }[] = [
  { value: 'VIEWER', label: 'Visualizador', description: 'Pode apenas visualizar cards', icon: Eye },
  { value: 'OPERATOR', label: 'Operador', description: 'Pode criar e mover cards', icon: Edit3 },
  { value: 'SUPERVISOR', label: 'Supervisor', description: 'Pode editar formulários', icon: Settings },
  { value: 'ADMIN', label: 'Administrador', description: 'Controle total do pipeline', icon: Shield },
];

const ROLE_COLORS: Record<PipelineRole, string> = {
  VIEWER: 'bg-gray-100 text-gray-700',
  OPERATOR: 'bg-blue-100 text-blue-700',
  SUPERVISOR: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-green-100 text-green-700',
};

export function PermissionsPanel({ pipelineId }: PermissionsPanelProps) {
  const [permissions, setPermissions] = useState<PipelinePermission[]>([]);
  const [availableGroups, setAvailableGroups] = useState<{ id: string; name: string; description: string | null; _count: { members: number } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add permission state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedRole, setSelectedRole] = useState<PipelineRole>('OPERATOR');
  const [saving, setSaving] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [pipelineId]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [permsRes, groupsRes] = await Promise.all([
        api.getPipelinePermissions(pipelineId),
        api.getAvailableGroupsForPipeline(pipelineId),
      ]);
      setPermissions(permsRes.items || []);
      setAvailableGroups(groupsRes);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar permissões');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPermission = async () => {
    if (!selectedGroupId) {
      setToast({ type: 'error', message: 'Selecione um grupo' });
      return;
    }

    setSaving(true);
    try {
      await api.assignPipelinePermission(pipelineId, {
        groupId: selectedGroupId,
        role: selectedRole,
      });
      setToast({ type: 'success', message: 'Permissão atribuída com sucesso' });
      setShowAddModal(false);
      setSelectedGroupId('');
      setSelectedRole('OPERATOR');
      loadData();
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Erro ao atribuir permissão' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (permissionId: string, newRole: PipelineRole) => {
    try {
      await api.updatePipelinePermission(pipelineId, permissionId, { role: newRole });
      setToast({ type: 'success', message: 'Permissão atualizada' });
      loadData();
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Erro ao atualizar permissão' });
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    if (!confirm('Tem certeza que deseja remover esta permissão?')) return;

    try {
      await api.removePipelinePermission(pipelineId, permissionId);
      setToast({ type: 'success', message: 'Permissão removida' });
      loadData();
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Erro ao remover permissão' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        <p>{error}</p>
        <button onClick={loadData} className="mt-2 text-sm underline">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Permissões do Pipeline</h3>
          <p className="text-sm text-gray-500">
            Defina quais grupos podem acessar este pipeline e com qual nível de permissão
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={availableGroups.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Grupo</span>
        </button>
      </div>

      {/* Permissions List */}
      {permissions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-600">Nenhuma permissão configurada</h4>
          <p className="text-gray-500 mt-1 max-w-md mx-auto">
            Este pipeline ainda não possui grupos com acesso.
            Adicione grupos para permitir que usuários operem neste pipeline.
          </p>
          {availableGroups.length > 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Adicionar Primeiro Grupo
            </button>
          )}
          {availableGroups.length === 0 && (
            <p className="text-sm text-amber-600 mt-4">
              Não há grupos disponíveis. Crie grupos na página de Grupos primeiro.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {permissions.map((permission) => {
            const roleOption = ROLE_OPTIONS.find((r) => r.value === permission.role);
            const RoleIcon = roleOption?.icon || Shield;

            return (
              <div key={permission.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {permission.group?.name || 'Grupo'}
                    </h4>
                    {permission.group?.description && (
                      <p className="text-sm text-gray-500">{permission.group.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Role Selector */}
                  <div className="relative">
                    <select
                      value={permission.role}
                      onChange={(e) => handleUpdateRole(permission.id, e.target.value as PipelineRole)}
                      className={`appearance-none pl-8 pr-8 py-1.5 rounded-full text-sm font-medium cursor-pointer ${ROLE_COLORS[permission.role]}`}
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <RoleIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4" />
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4" />
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleRemovePermission(permission.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    title="Remover permissão"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Role Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Níveis de Permissão</h4>
        <div className="grid grid-cols-2 gap-3">
          {ROLE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <div key={option.value} className="flex items-start space-x-2">
                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[option.value]}`}>
                  <Icon className="w-3 h-3" />
                  <span>{option.label}</span>
                </span>
                <span className="text-xs text-gray-500">{option.description}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Permission Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Adicionar Permissão</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grupo *
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um grupo...</option>
                  {availableGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group._count.members} membros)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nível de Permissão *
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as PipelineRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedGroupId('');
                  setSelectedRole('OPERATOR');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPermission}
                disabled={saving || !selectedGroupId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Adicionar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white z-50`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
