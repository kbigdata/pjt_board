import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { commentsApi, type Comment } from '@/api/comments';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';

function useTimeAgo() {
  const { t } = useTranslation('common');
  return (date: string): string => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('date.justNow');
    if (mins < 60) return t('date.minutesAgo', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('date.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('date.daysAgo', { count: days });
  };
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ThreadView() {
  const { activeThreadId, activeCardId } = useUIStore();
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { t } = useTranslation('comment');
  const { t: tc } = useTranslation('common');
  const timeAgo = useTimeAgo();
  const [replyText, setReplyText] = useState('');

  // Fetch parent comment from card comments cache
  const { data: cardComments } = useQuery<Comment[]>({
    queryKey: ['comments', 'card', activeCardId],
    queryFn: () => commentsApi.getByCardId(activeCardId!),
    enabled: !!activeCardId,
  });

  const parentComment = cardComments?.find((c) => c.id === activeThreadId);

  const { data: replies = [], isLoading } = useQuery<Comment[]>({
    queryKey: ['comments', 'replies', activeThreadId],
    queryFn: () => commentsApi.getReplies(activeThreadId!),
    enabled: !!activeThreadId,
  });

  const createReplyMutation = useMutation({
    mutationFn: (content: string) => commentsApi.createReply(activeThreadId!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', 'replies', activeThreadId] });
      queryClient.invalidateQueries({ queryKey: ['comments', 'card', activeCardId] });
      setReplyText('');
    },
  });

  const handleSubmit = () => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    createReplyMutation.mutate(trimmed);
  };

  if (!activeThreadId) return null;

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Parent comment */}
      {parentComment && (
        <div className="border-b border-[var(--border-primary)] pb-4">
          <div className="flex items-start gap-2">
            <Avatar name={parentComment.author.name} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">{parentComment.author.name}</span>
                <span className="text-xs text-[var(--text-tertiary)]">{timeAgo(parentComment.createdAt)}</span>
              </div>
              <p className="text-sm text-[var(--text-primary)] mt-0.5 whitespace-pre-wrap">{parentComment.content}</p>
            </div>
          </div>
        </div>
      )}

      {/* Replies */}
      <div className="flex-1 space-y-3">
        {replies.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <div className="flex-1 h-px bg-[var(--border-primary)]" />
            <span>{t('replies', { count: replies.length })}</span>
            <div className="flex-1 h-px bg-[var(--border-primary)]" />
          </div>
        )}

        {isLoading ? (
          <div className="text-sm text-[var(--text-tertiary)]">{tc('loading')}</div>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-2">
              <Avatar name={reply.author.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{reply.author.name}</span>
                  <span className="text-xs text-[var(--text-tertiary)]">{timeAgo(reply.createdAt)}</span>
                </div>
                <p className="text-sm text-[var(--text-primary)] mt-0.5 whitespace-pre-wrap">{reply.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply input */}
      <div className="border-t border-[var(--border-primary)] pt-3">
        <div className="flex items-start gap-2">
          {currentUser && <Avatar name={currentUser.name} />}
          <div className="flex-1">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={t('replyPlaceholder')}
              rows={2}
              className="w-full text-sm border border-[var(--border-primary)] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none bg-[var(--bg-primary)] text-[var(--text-primary)]"
            />
            <div className="flex justify-end mt-1">
              <button
                onClick={handleSubmit}
                disabled={!replyText.trim() || createReplyMutation.isPending}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {t('reply')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
