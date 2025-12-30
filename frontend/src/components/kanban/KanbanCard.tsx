import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, FileText, AlertCircle, CheckCircle, Clock, Zap, XCircle, Loader2 } from 'lucide-react';
import type { KanbanCard as KanbanCardType } from '../../types';
import { clsx } from 'clsx';

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

          {/* Forms info */}
          {card.forms && card.forms.length > 0 && (
            <div className="mt-2 space-y-1">
              {card.forms.slice(0, 2).map((form) => (
                <div key={form.id} className="flex items-center gap-1 text-xs">
                  {form.status === 'FILLED' ? (
                    <CheckCircle size={12} className="text-green-500" />
                  ) : (
                    <AlertCircle size={12} className="text-amber-500" />
                  )}
                  <span className={clsx(
                    'truncate',
                    form.status === 'FILLED' ? 'text-green-700' : 'text-amber-700'
                  )}>
                    {form.formDefinition?.name || 'Formulário'}
                  </span>
                </div>
              ))}
              {card.forms.length > 2 && (
                <span className="text-xs text-gray-400">+{card.forms.length - 2} mais</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className={clsx(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                priorityColors[card.priority]
              )}
            >
              {priorityLabels[card.priority]}
            </span>

            {card.totalFormsCount > 0 && (
              <span className={clsx(
                'flex items-center gap-1 text-xs',
                card.pendingFormsCount > 0 ? 'text-amber-600' : 'text-green-600'
              )}>
                <FileText size={12} />
                {card.filledFormsCount}/{card.totalFormsCount}
              </span>
            )}

            {/* Integration execution status */}
            {card.triggerExecutionSummary && card.triggerExecutionSummary.total > 0 && (
              <span
                className={clsx(
                  'flex items-center gap-1 text-xs',
                  card.triggerExecutionSummary.lastStatus === 'SUCCESS' && 'text-green-600',
                  card.triggerExecutionSummary.lastStatus === 'FAILURE' && 'text-red-600',
                  card.triggerExecutionSummary.lastStatus === 'PENDING' && 'text-amber-600'
                )}
                title={`Integrações: ${card.triggerExecutionSummary.success} sucesso, ${card.triggerExecutionSummary.failure} erro${card.triggerExecutionSummary.lastIntegrationName ? ` - Última: ${card.triggerExecutionSummary.lastIntegrationName}` : ''}`}
              >
                {card.triggerExecutionSummary.lastStatus === 'SUCCESS' && <Zap size={12} className="text-green-500" />}
                {card.triggerExecutionSummary.lastStatus === 'FAILURE' && <XCircle size={12} className="text-red-500" />}
                {card.triggerExecutionSummary.lastStatus === 'PENDING' && <Loader2 size={12} className="text-amber-500 animate-spin" />}
                {card.triggerExecutionSummary.success}/{card.triggerExecutionSummary.total}
              </span>
            )}
          </div>

          {/* Creation date */}
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
            <Clock size={10} />
            <span>{formatDate(card.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
