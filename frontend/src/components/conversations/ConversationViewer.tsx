import { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { api } from '../../services/api';
import type { CardConversation, ConversationMessage } from '../../types';
import { MessageBubble } from './MessageBubble';
import { ArrowLeft, Loader2, ChevronDown } from 'lucide-react';

interface ConversationViewerProps {
  conversation: CardConversation;
  onBack: () => void;
}

const channelLabels: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  WEBCHAT: 'WebChat',
  PHONE: 'Telefone',
  EMAIL: 'Email',
  OTHER: 'Outro',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  ABANDONED: 'bg-red-100 text-red-800',
  TRANSFERRED: 'bg-yellow-100 text-yellow-800',
};

export function ConversationViewer({ conversation, onBack }: ConversationViewerProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const limit = 50;

  useEffect(() => {
    loadMessages();
  }, [conversation.id]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const result = await api.getConversationMessages(conversation.id, limit, 0);
      setMessages(result.messages);
      setTotal(result.total);
      setOffset(result.messages.length);

      // Scroll to bottom after loading
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (loadingMore || offset >= total) return;

    try {
      setLoadingMore(true);
      const result = await api.getConversationMessages(conversation.id, limit, offset);
      setMessages(prev => [...prev, ...result.messages]);
      setOffset(prev => prev + result.messages.length);
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <button
          onClick={onBack}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{channelLabels[conversation.channel]}</span>
            <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', statusColors[conversation.status])}>
              {conversation.status}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Iniciada em {formatDate(conversation.startedAt)}
            {conversation.endedAt && ` - Encerrada em ${formatDate(conversation.endedAt)}`}
          </p>
        </div>
      </div>

      {/* Participants */}
      {conversation.participants && conversation.participants.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b">
          <p className="text-xs text-gray-600">
            <span className="font-medium">Participantes:</span>{' '}
            {conversation.participants.map((p: { name: string }) => p.name).join(', ')}
          </p>
        </div>
      )}

      {/* Summary */}
      {conversation.summary && (
        <div className="px-4 py-2 bg-blue-50 border-b">
          <p className="text-xs text-blue-800">
            <span className="font-medium">Resumo:</span> {conversation.summary}
          </p>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Nenhuma mensagem
          </div>
        ) : (
          <>
            {messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {offset < total && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={loadMoreMessages}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Carregar mais ({total - offset} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
