import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { KanbanBoard } from '../components/kanban';
import { Modal } from '../components/ui';
import type { KanbanBoard as KanbanBoardType, KanbanCard, CardFull } from '../types';

export function PipelineKanbanPage() {
  const { pipelineId } = useParams<{ pipelineId: string }>();
  const { organization } = useTenant();
  const [board, setBoard] = useState<KanbanBoardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Card detail modal
  const [selectedCard, setSelectedCard] = useState<CardFull | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);

  // Create card modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [_createStageId, setCreateStageId] = useState<string | null>(null);
  const [newCard, setNewCard] = useState({ title: '', description: '', priority: 'medium' });
  const [creating, setCreating] = useState(false);

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
    try {
      const fullCard = await api.getCard(card.id);
      setSelectedCard(fullCard);
    } catch (error) {
      console.error('Failed to fetch card details:', error);
    } finally {
      setLoadingCard(false);
    }
  };

  const handleAddCard = (stageId: string) => {
    setCreateStageId(stageId);
    setShowCreateModal(true);
  };

  const handleCreateCard = async (e: FormEvent) => {
    e.preventDefault();
    if (!pipelineId || !newCard.title) return;

    setCreating(true);
    try {
      await api.createCard({
        pipelineId,
        title: newCard.title,
        description: newCard.description,
        priority: newCard.priority,
      });
      setShowCreateModal(false);
      setNewCard({ title: '', description: '', priority: 'medium' });
      setCreateStageId(null);
      fetchBoard();
    } catch (error) {
      console.error('Failed to create card:', error);
    } finally {
      setCreating(false);
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
        }}
        title="Create Card"
      >
        <form onSubmit={handleCreateCard} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              type="text"
              value={newCard.title}
              onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
              className="input mt-1"
              placeholder="Card title..."
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={newCard.description}
              onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
              className="input mt-1"
              rows={3}
              placeholder="Optional description..."
            />
          </div>

          <div>
            <label className="label">Priority</label>
            <select
              value={newCard.priority}
              onChange={(e) => setNewCard({ ...newCard, priority: e.target.value })}
              className="input mt-1"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setCreateStageId(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !newCard.title}
              className="btn-primary"
            >
              {creating ? 'Creating...' : 'Create Card'}
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
          <div className="space-y-6">
            {/* Card Info */}
            <div>
              <p className="text-gray-600">{selectedCard.card.description || 'No description'}</p>
              <div className="flex gap-4 mt-3 text-sm text-gray-500">
                <span>Priority: <span className="font-medium">{selectedCard.card.priority}</span></span>
                <span>Status: <span className="font-medium">{selectedCard.card.status}</span></span>
                <span>Stage: <span className="font-medium">{selectedCard.card.currentStage.name}</span></span>
              </div>
            </div>

            {/* Forms */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Forms ({selectedCard.forms.length})</h4>
              <div className="space-y-2">
                {selectedCard.forms.map((form) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <span className="font-medium">{form.formDefinition?.name || 'Form'}</span>
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
              </div>
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
              <h4 className="font-semibold text-gray-900 mb-2">History ({selectedCard.history.length})</h4>
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
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
