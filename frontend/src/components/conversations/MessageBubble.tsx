import { clsx } from 'clsx';
import type { ConversationMessage, ParticipantType } from '../../types';
import { User, Bot, Headphones } from 'lucide-react';

interface MessageBubbleProps {
  message: ConversationMessage;
}

const senderTypeConfig: Record<ParticipantType, { icon: typeof User; bgColor: string; align: 'left' | 'right' }> = {
  CLIENT: { icon: User, bgColor: 'bg-gray-100', align: 'left' },
  AGENT: { icon: Bot, bgColor: 'bg-blue-100', align: 'right' },
  OPERATOR: { icon: Headphones, bgColor: 'bg-green-100', align: 'right' },
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const config = senderTypeConfig[message.senderType];
  const Icon = config.icon;
  const isLeft = config.align === 'left';

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  return (
    <div className={clsx('flex gap-2 mb-3', isLeft ? 'justify-start' : 'justify-end')}>
      {isLeft && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-600" />
        </div>
      )}

      <div className={clsx('max-w-[70%]', isLeft ? 'items-start' : 'items-end')}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-600">{message.senderName}</span>
          <span className="text-xs text-gray-400">
            {formatDate(message.sentAt)} {formatTime(message.sentAt)}
          </span>
        </div>

        <div className={clsx('rounded-lg px-3 py-2', config.bgColor)}>
          {message.contentType === 'text' ? (
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</p>
          ) : message.contentType === 'image' && message.mediaUrl ? (
            <div>
              <img
                src={message.mediaUrl}
                alt="Image"
                className="max-w-full rounded-md max-h-64 object-contain"
              />
              {message.content && <p className="text-sm text-gray-800 mt-2">{message.content}</p>}
            </div>
          ) : message.contentType === 'audio' && message.mediaUrl ? (
            <audio controls className="max-w-full">
              <source src={message.mediaUrl} />
              Your browser does not support the audio element.
            </audio>
          ) : message.contentType === 'file' && message.mediaUrl ? (
            <a
              href={message.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {message.content || 'Download file'}
            </a>
          ) : (
            <p className="text-sm text-gray-800">{message.content}</p>
          )}
        </div>
      </div>

      {!isLeft && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
      )}
    </div>
  );
}
