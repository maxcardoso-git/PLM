import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  UserPlus,
  UserMinus,
  Search,
  Shield,
} from 'lucide-react';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import type { UserGroup, GroupMember } from '../types';

export function GroupsPage() {
  const { organization } = useTenant();

  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<UserGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Members state
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadGroups();
  }, [organization]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await api.getUserGroups();
      setGroups(response.items);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setFormName('');
    setFormDescription('');
    setShowCreateModal(true);
  };

  const handleOpenEdit = (group: UserGroup) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormDescription(group.description || '');
    setShowCreateModal(true);
  };

  const handleSaveGroup = async () => {
    if (!formName.trim()) {
      setToast({ type: 'error', message: 'Nome do grupo é obrigatório' });
      return;
    }

    setFormSaving(true);
    try {
      if (editingGroup) {
        await api.updateUserGroup(editingGroup.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
        });
        setToast({ type: 'success', message: 'Grupo atualizado com sucesso' });
      } else {
        await api.createUserGroup({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
        });
        setToast({ type: 'success', message: 'Grupo criado com sucesso' });
      }
      setShowCreateModal(false);
      loadGroups();
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Erro ao salvar grupo' });
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;

    try {
      await api.deleteUserGroup(deletingGroup.id);
      setToast({ type: 'success', message: 'Grupo excluído com sucesso' });
      setShowDeleteModal(false);
      setDeletingGroup(null);
      loadGroups();
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Erro ao excluir grupo' });
    }
  };

  const handleOpenMembers = async (group: UserGroup) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
    setLoadingMembers(true);
    setSelectedUserIds([]);
    setSearchTerm('');

    try {
      const [membersRes, availableRes] = await Promise.all([
        api.getGroupMembers(group.id),
        api.getAvailableUsersForGroup(group.id),
      ]);
      setMembers(membersRes.items);
      setAvailableUsers(availableRes.items);
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Erro ao carregar membros' });
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMembers = async () => {
    if (!selectedGroup || selectedUserIds.length === 0) return;

    try {
      await api.addGroupMembers(selectedGroup.id, selectedUserIds);
      setToast({ type: 'success', message: `${selectedUserIds.length} membro(s) adicionado(s)` });
      setSelectedUserIds([]);

      // Reload members and available users
      const [membersRes, availableRes] = await Promise.all([
        api.getGroupMembers(selectedGroup.id),
        api.getAvailableUsersForGroup(selectedGroup.id),
      ]);
      setMembers(membersRes.items);
      setAvailableUsers(availableRes.items);
      loadGroups(); // Update counts
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Erro ao adicionar membros' });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return;

    try {
      await api.removeGroupMember(selectedGroup.id, userId);
      setToast({ type: 'success', message: 'Membro removido com sucesso' });

      // Reload members and available users
      const [membersRes, availableRes] = await Promise.all([
        api.getGroupMembers(selectedGroup.id),
        api.getAvailableUsersForGroup(selectedGroup.id),
      ]);
      setMembers(membersRes.items);
      setAvailableUsers(availableRes.items);
      loadGroups(); // Update counts
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Erro ao remover membro' });
    }
  };

  const filteredAvailableUsers = availableUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        <p>{error}</p>
        <button onClick={loadGroups} className="mt-2 text-sm underline">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Grupos de Usuários</h1>
            <p className="text-sm text-gray-500">
              Gerencie grupos e equipes para controle de permissões
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Grupo</span>
        </button>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhum grupo criado</h3>
          <p className="text-gray-500 mt-1">
            Crie grupos para organizar usuários e atribuir permissões aos pipelines.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Criar primeiro grupo
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">{group.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEdit(group)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeletingGroup(group);
                      setShowDeleteModal(true);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{group._count?.members || 0} membros</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Shield className="w-4 h-4" />
                    <span>{group._count?.permissions || 0} pipelines</span>
                  </span>
                </div>
                <button
                  onClick={() => handleOpenMembers(group)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Membros</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Grupo *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Equipe de Vendas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descrição opcional do grupo"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGroup}
                disabled={formSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {formSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{editingGroup ? 'Salvar' : 'Criar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deletingGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold">Excluir Grupo</h2>
            </div>

            <p className="text-gray-600">
              Tem certeza que deseja excluir o grupo <strong>{deletingGroup.name}</strong>?
              Esta ação não pode ser desfeita e todos os membros e permissões serão removidos.
            </p>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingGroup(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteGroup}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Membros do Grupo</h2>
                <p className="text-sm text-gray-500">{selectedGroup.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowMembersModal(false);
                  setSelectedGroup(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingMembers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="flex-1 overflow-auto space-y-4">
                {/* Add Members Section */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Adicionar Membros</h3>

                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar usuários..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {filteredAvailableUsers.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">
                      {availableUsers.length === 0
                        ? 'Todos os usuários já são membros deste grupo'
                        : 'Nenhum usuário encontrado'}
                    </p>
                  ) : (
                    <>
                      <div className="max-h-40 overflow-auto space-y-2">
                        {filteredAvailableUsers.map((user) => (
                          <label
                            key={user.id}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUserIds([...selectedUserIds, user.id]);
                                } else {
                                  setSelectedUserIds(selectedUserIds.filter((id) => id !== user.id));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div>
                              <p className="font-medium text-sm text-gray-900">{user.name}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={handleAddMembers}
                        disabled={selectedUserIds.length === 0}
                        className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Adicionar {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Current Members Section */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">
                    Membros Atuais ({members.length})
                  </h3>

                  {members.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">
                      Nenhum membro neste grupo
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                        >
                          <div>
                            <p className="font-medium text-sm text-gray-900">{member.user.name}</p>
                            <p className="text-xs text-gray-500">{member.user.email}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Remover membro"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
