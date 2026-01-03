import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { api } from '../../services/api';
import type { CardConversation, Participant } from '../../types';
import { ConversationViewer } from './ConversationViewer';
import {
  MessageCircle,
  Phone,
  Mail,
  MessageSquare,
  HelpCircle,
  Loader2,
  X,
} from 'lucide-react';

interface ConversationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  cardTitle: string;
}

const channelIcons: Record<string, typeof MessageCircle> = {
  WHATSAPP: MessageCircle,
  WEBCHAT: MessageSquare,
  PHONE: Phone,
  EMAIL: Mail,
  OTHER: HelpCircle,
};

const channelLabels: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  WEBCHAT: 'WebChat',
  PHONE: 'Telefone',
  EMAIL: 'Email',
  OTHER: 'Outro',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Ativa',
  CLOSED: 'Encerrada',
  ABANDONED: 'Abandonada',
  TRANSFERRED: 'Transferida',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  ABANDONED: 'bg-red-100 text-red-800',
  TRANSFERRED: 'bg-yellow-100 text-yellow-800',
};

export function ConversationsModal({
  open,
  onOpenChange,
  cardId,
  cardTitle,
}: ConversationsModalProps) {
  const [conversations, setConversations] = useState<CardConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<CardConversation | null>(null);
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (open && cardId) {
      loadConversations();
    }
  }, [open, cardId]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await api.getCardConversations(cardId);
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (filterChannel !== 'all' && conv.channel !== filterChannel) return false;
    if (filterStatus !== 'all' && conv.status !== filterStatus) return false;
    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  const handleClose = () => {
    setSelectedConversation(null);
    onOpenChange(false);
  };

  const uniqueChannels = [...new Set(conversations.map(c => c.channel))];
  const uniqueStatuses = [...new Set(conversations.map(c => c.status))];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 h-[600px] flex flex-col">
        {selectedConversation ? (
          <ConversationViewer
            conversation={selectedConversation}
            onBack={handleBack}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Conversas - {cardTitle}
              </h2>
              <button
                onClick={handleClose}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 p-4 border-b bg-gray-50">
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos os canais</option>
                {uniqueChannels.map(channel => (
                  <option key={channel} value={channel}>
                    {channelLabels[channel]}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos os status</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>

              <div className="flex-1 text-right text-sm text-gray-500 self-center">
                {filteredConversations.length} conversa(s)
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <MessageCircle className="w-12 h-12 mb-2 text-gray-300" />
                  <p>Nenhuma conversa encontrada</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map(conversation => {
                    const ChannelIcon = channelIcons[conversation.channel] || HelpCircle;

                    return (
                      <div
                        key={conversation.id}
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedConversation(conversation)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <ChannelIcon className="w-5 h-5 text-blue-600" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {channelLabels[conversation.channel]}
                              </span>
                              <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', statusColors[conversation.status])}>
                                {statusLabels[conversation.status]}
                              </span>
                              {conversation.stageName && (
                                <span className="text-xs text-gray-500">
                                  @ {conversation.stageName}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-500 mb-1">
                              {formatDate(conversation.startedAt)}
                              {conversation.endedAt && ` - ${formatDate(conversation.endedAt)}`}
                            </p>

                            {conversation.participants && conversation.participants.length > 0 && (
                              <p className="text-xs text-gray-600 truncate">
                                {conversation.participants.map((p: Participant) => p.name).join(', ')}
                              </p>
                            )}

                            {conversation.summary && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {conversation.summary}
                              </p>
                            )}
                          </div>

                          <div className="flex-shrink-0 text-right">
                            {conversation.messageCount !== undefined && (
                              <span className="text-xs text-gray-500">
                                {conversation.messageCount} msg
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
