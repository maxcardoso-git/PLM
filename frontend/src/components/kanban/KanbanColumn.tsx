import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, AlertTriangle } from 'lucide-react';
import type { KanbanStage, KanbanCard as KanbanCardType } from '../../types';
import { KanbanCard } from './KanbanCard';
import { clsx } from 'clsx';

interface KanbanColumnProps {
  stage: KanbanStage;
  onCardClick: (card: KanbanCardType) => void;
  onAddCard?: (stageId: string) => void;
  isOver?: boolean;
}

const classificationStyles: Record<string, string> = {
  NOT_STARTED: 'border-t-gray-400',
  ON_GOING: 'border-t-blue-500',
  WAITING: 'border-t-amber-500',
  FINISHED: 'border-t-green-500',
  CANCELED: 'border-t-red-500',
};

export function KanbanColumn({ stage, onCardClick, onAddCard, isOver }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: stage.id,
    data: {
      type: 'column',
      stage,
    },
  });

  const isAtWipLimit = stage.wipLimit && stage.cardCount >= stage.wipLimit;

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'kanban-column border-t-4',
        classificationStyles[stage.classification],
        isOver && 'ring-2 ring-blue-500 ring-opacity-50'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-semibold text-gray-800">{stage.name}</h3>
          <span className="text-sm text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
            {stage.cardCount}
            {stage.wipLimit && `/${stage.wipLimit}`}
          </span>
        </div>

        {stage.isInitial && onAddCard && (
          <button
            onClick={() => onAddCard(stage.id)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      {/* WIP Limit Warning */}
      {isAtWipLimit && (
        <div className="flex items-center gap-1 text-xs text-amber-600 mb-2 bg-amber-50 px-2 py-1 rounded">
          <AlertTriangle size={12} />
          WIP limit reached
        </div>
      )}

      {/* Cards */}
      <SortableContext
        items={stage.cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[100px]">
          {stage.cards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={onCardClick} />
          ))}

          {stage.cards.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              No cards
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
