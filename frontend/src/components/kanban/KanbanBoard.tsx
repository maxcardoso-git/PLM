import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import type { KanbanBoard as KanbanBoardType, KanbanCard as KanbanCardType, KanbanStage } from '../../types';
import { api } from '../../services/api';

interface KanbanBoardProps {
  board: KanbanBoardType;
  onRefresh: () => void;
  onCardClick: (card: KanbanCardType) => void;
  onAddCard: (stageId: string) => void;
}

export function KanbanBoard({ board, onRefresh, onCardClick, onAddCard }: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findStageByCardId = useCallback(
    (cardId: string): KanbanStage | undefined => {
      return board.stages.find((stage) =>
        stage.cards.some((card) => card.id === cardId)
      );
    },
    [board.stages]
  );

  const canMoveToStage = useCallback(
    (card: KanbanCardType, targetStageId: string): boolean => {
      const sourceStage = findStageByCardId(card.id);
      if (!sourceStage) return false;

      return sourceStage.allowedTransitions.some(
        (t) => t.toStageId === targetStageId
      );
    },
    [findStageByCardId]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = active.data.current?.card as KanbanCardType;
    setActiveCard(card);
    setMoveError(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveCard(null);
    setOverId(null);

    if (!over) return;

    const card = active.data.current?.card as KanbanCardType;
    const targetStageId = over.data.current?.type === 'column'
      ? (over.id as string)
      : findStageByCardId(over.id as string)?.id;

    if (!targetStageId || card.currentStageId === targetStageId) return;

    // Check if transition is allowed
    if (!canMoveToStage(card, targetStageId)) {
      setMoveError('Transition to this stage is not allowed');
      setTimeout(() => setMoveError(null), 3000);
      return;
    }

    try {
      await api.moveCard(card.id, targetStageId, 'manual');
      onRefresh();
    } catch (error: any) {
      const errorData = error.response?.data;
      if (errorData?.code) {
        setMoveError(errorData.message || 'Move failed');
      } else {
        setMoveError('Failed to move card');
      }
      setTimeout(() => setMoveError(null), 5000);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Pipeline Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{board.pipeline.name}</h1>
          <p className="text-sm text-gray-500">
            Pipeline: {board.pipeline.key} | Version: {board.pipeline.publishedVersion}
          </p>
        </div>
      </div>

      {/* Error Toast */}
      {moveError && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
          {moveError}
        </div>
      )}

      {/* Kanban Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {board.stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              onCardClick={onCardClick}
              onAddCard={stage.isInitial ? onAddCard : undefined}
              isOver={overId === stage.id}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard && (
            <div className="rotate-3 opacity-90">
              <KanbanCard card={activeCard} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
