import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, FileText, AlertCircle } from 'lucide-react';
import type { KanbanCard as KanbanCardType } from '../../types';
import { clsx } from 'clsx';

interface KanbanCardProps {
  card: KanbanCardType;
  onClick: (card: KanbanCardType) => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export function KanbanCard({ card, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'kanban-card group',
        isDragging && 'opacity-50 ring-2 ring-blue-500'
      )}
      onClick={() => onClick(card)}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-400 hover:text-gray-600"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm truncate">
            {card.title}
          </h4>

          {card.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {card.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span
              className={clsx(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                priorityColors[card.priority]
              )}
            >
              {priorityLabels[card.priority]}
            </span>

            {card.pendingFormsCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle size={12} />
                {card.pendingFormsCount} pending
              </span>
            )}

            {card.forms && card.forms.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <FileText size={12} />
                {card.forms.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
