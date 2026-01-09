import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, FileText, AlertCircle, CheckCircle, Clock, Zap, XCircle, Loader2, Info, Key, Hash, MessageSquare } from 'lucide-react';
import type { KanbanCard as KanbanCardType, KanbanStageTrigger } from '../../types';
import { clsx } from 'clsx';

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeDate(date: string) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return formatDate(date);
}

interface KanbanCardProps {
  card: KanbanCardType;
  onClick: (card: KanbanCardType) => void;
  stageTriggers?: KanbanStageTrigger[];
}

const priorityConfig: Record<string, { bg: string; text: string; border: string; label: string; dot: string; leftBorder: string }> = {
  low: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', label: 'Baixa', dot: 'bg-slate-400', leftBorder: 'border-l-slate-400' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Média', dot: 'bg-blue-500', leftBorder: 'border-l-blue-500' },
  high: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Alta', dot: 'bg-amber-500', leftBorder: 'border-l-amber-500' },
  urgent: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Urgente', dot: 'bg-red-500', leftBorder: 'border-l-red-500' },
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  OPEN: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Aberto' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Em Progresso' },
  CLOSED: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Fechado' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-600', label: 'Cancelado' },
};

export function KanbanCard({ card, onClick, stageTriggers }: KanbanCardProps) {
  const [showTriggers, setShowTriggers] = useState(false);

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

  const priority = priorityConfig[card.priority] || priorityConfig.medium;
  const status = statusConfig[card.status] || statusConfig.OPEN;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'bg-white rounded-lg border border-gray-200/80 border-l-4 p-3 cursor-pointer transition-all duration-200 group',
        'shadow-sm hover:shadow-lg hover:border-gray-300/80 hover:-translate-y-0.5',
        'backdrop-blur-sm',
        priority.leftBorder,
        isDragging && 'opacity-60 ring-2 ring-blue-500 shadow-xl scale-[1.02]'
      )}
      onClick={() => onClick(card)}
    >
      {/* Header: Drag handle + Priority indicator */}
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 -ml-1 -mt-0.5 text-gray-300 hover:text-gray-500"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </button>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">
            {card.title}
          </h4>

          {/* Description */}
          {card.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {card.description}
            </p>
          )}

          {/* Unique Key (ID do cliente, CPF, etc) */}
          {card.uniqueKeyValue && (
            <div className="mt-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/50 rounded-md">
                <Key size={10} className="text-indigo-500" />
                <span className="text-[11px] font-medium text-indigo-700 truncate max-w-[150px]">
                  {card.uniqueKeyValue}
                </span>
              </div>
            </div>
          )}

          {/* Forms summary */}
          {card.forms && card.forms.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {card.forms.slice(0, 2).map((form) => (
                <div key={form.id} className="flex items-center gap-1.5 text-[11px]">
                  {form.status === 'FILLED' ? (
                    <CheckCircle size={10} className="text-emerald-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle size={10} className="text-amber-500 flex-shrink-0" />
                  )}
                  <span className={clsx(
                    'truncate',
                    form.status === 'FILLED' ? 'text-emerald-600' : 'text-amber-600'
                  )}>
                    {form.formDefinition?.name || 'Formulário'}
                  </span>
                </div>
              ))}
              {card.forms.length > 2 && (
                <span className="text-[10px] text-gray-400 ml-4">+{card.forms.length - 2} mais</span>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {/* Priority badge */}
            <span className={clsx(
              'text-[10px] px-2 py-0.5 rounded-full font-medium border',
              priority.bg, priority.text, priority.border
            )}>
              {priority.label}
            </span>

            {/* Status badge */}
            <span className={clsx(
              'text-[10px] px-2 py-0.5 rounded-full font-medium',
              status.bg, status.text
            )}>
              {status.label}
            </span>

            {/* Forms counter */}
            {card.totalFormsCount > 0 && (
              <span className={clsx(
                'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                card.pendingFormsCount > 0
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              )}>
                <FileText size={10} />
                {card.filledFormsCount}/{card.totalFormsCount}
              </span>
            )}

            {/* Comments counter */}
            {card.commentsCount !== undefined && card.commentsCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 border border-gray-200">
                <MessageSquare size={10} />
                {card.commentsCount}
              </span>
            )}

            {/* Integration status */}
            {card.triggerExecutionSummary && card.triggerExecutionSummary.total > 0 && (
              <span
                className={clsx(
                  'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium border',
                  card.triggerExecutionSummary.lastStatus === 'SUCCESS' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  card.triggerExecutionSummary.lastStatus === 'FAILURE' && 'bg-red-50 text-red-700 border-red-200',
                  card.triggerExecutionSummary.lastStatus === 'PENDING' && 'bg-amber-50 text-amber-700 border-amber-200'
                )}
                title={`Integrações: ${card.triggerExecutionSummary.success} sucesso, ${card.triggerExecutionSummary.failure} erro${card.triggerExecutionSummary.lastIntegrationName ? ` - Última: ${card.triggerExecutionSummary.lastIntegrationName}` : ''}`}
              >
                {card.triggerExecutionSummary.lastStatus === 'SUCCESS' && <Zap size={10} />}
                {card.triggerExecutionSummary.lastStatus === 'FAILURE' && <XCircle size={10} />}
                {card.triggerExecutionSummary.lastStatus === 'PENDING' && <Loader2 size={10} className="animate-spin" />}
                {card.triggerExecutionSummary.success}/{card.triggerExecutionSummary.total}
              </span>
            )}

            {/* Stage triggers indicator */}
            {stageTriggers && stageTriggers.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTriggers(!showTriggers);
                }}
                className="flex items-center gap-0.5 text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                title="Ver integrações configuradas"
              >
                <Zap size={9} />
                <Info size={9} />
              </button>
            )}
          </div>

          {/* Integration rules popup */}
          {showTriggers && stageTriggers && stageTriggers.length > 0 && (
            <div className="mt-2 p-2 bg-purple-50/80 border border-purple-200/60 rounded-lg text-xs">
              <div className="font-medium text-purple-800 mb-1 flex items-center gap-1">
                <Zap size={10} />
                Integrações Configuradas
              </div>
              <ul className="space-y-0.5">
                {stageTriggers.map((trigger) => (
                  <li key={trigger.id} className="text-purple-600 flex items-center gap-1 text-[10px]">
                    <span className="w-1 h-1 bg-purple-400 rounded-full" />
                    {trigger.integrationName}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer: Date and ID */}
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100/60">
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Clock size={10} />
              <span title={formatDate(card.createdAt)}>{formatRelativeDate(card.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-300">
              <Hash size={9} />
              <span className="font-mono">{card.id.slice(-6)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
