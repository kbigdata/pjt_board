import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pin, MoreHorizontal, MessageSquare } from 'lucide-react';
import { commentsApi, type Comment } from '@/api/comments';
import { reactionsApi } from '@/api/reactions';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import EmojiReactionBadge from '@/components/EmojiReactionBadge';
import ThreadSummary from '@/components/ThreadSummary';

interface Props {
  cardId: string;
}

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

interface CommentItemProps {
  comment: Comment;
  cardId: string;
  currentUserId?: string;
}

function CommentItem({ comment, cardId, currentUserId }: CommentItemProps) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('comment');
  const { t: tc } = useTranslation('common');
  const timeAgo = useTimeAgo();
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);

  const updateMutation = useMutation({
    mutationFn: (content: string) => commentsApi.update(comment.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', 'card', cardId] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => commentsApi.delete(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', 'card', cardId] });
    },
  });

  const pinMutation = useMutation({
    mutationFn: () => commentsApi.togglePin(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', 'card', cardId] });
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: (emoji: string) => reactionsApi.addReaction(comment.id, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', 'card', cardId] });
    },
  });

  const removeReactionMutation = useMutation({
    mutationFn: (emoji: string) => reactionsApi.removeReaction(comment.id, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', 'card', cardId] });
    },
  });

  const openThread = useUIStore((s) => s.openThread);
  const isOwner = currentUserId === comment.authorId;

  return (
    <div className="group relative">
      {comment.isPinned && (
        <div className="flex items-center gap-1 text-xs text-amber-600 mb-1">
          <Pin size={10} />
          <span>{t('pinned')}</span>
        </div>
      )}
      <div className="flex items-start gap-2">
        <Avatar name={comment.author.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">{comment.author.name}</span>
            <span className="text-xs text-[var(--text-tertiary)]">{timeAgo(comment.createdAt)}</span>
            {comment.isPinned && <Pin size={11} className="text-amber-500" />}
          </div>

          {editing ? (
            <div className="mt-1 space-y-1">
              <textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full text-sm border border-[var(--border-primary)] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] resize-none bg-[var(--bg-primary)] text-[var(--text-primary)]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => updateMutation.mutate(editText)}
                  disabled={updateMutation.isPending}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {tc('save')}
                </button>
                <button
                  onClick={() => {
                    setEditText(comment.content);
                    setEditing(false);
                  }}
                  className="text-xs px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {tc('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="comment-bubble mt-1 px-3 py-2">
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{comment.content}</p>
            </div>
          )}

          {/* Reactions */}
          <EmojiReactionBadge
            reactions={comment.reactions ?? []}
            onAdd={(emoji) => addReactionMutation.mutate(emoji)}
            onRemove={(emoji) => removeReactionMutation.mutate(emoji)}
          />

          {/* Thread summary */}
          <ThreadSummary
            commentId={comment.id}
            replyCount={comment._count?.replies ?? 0}
            lastReplyUser={comment.replies?.[0]?.author ?? null}
          />
        </div>

        {/* Actions menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 flex items-center gap-0.5">
          {comment.parentCommentId === null && (
            <button
              onClick={() => openThread(comment.id)}
              title={t('reply')}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] rounded"
            >
              <MessageSquare size={14} />
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded"
            >
              <MoreHorizontal size={14} />
            </button>
            {showMenu && (
              <div className="dropdown-menu absolute right-0 top-full mt-1 py-1 z-20 min-w-[120px]">
                <button
                  onClick={() => {
                    pinMutation.mutate();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                >
                  {comment.isPinned ? t('unpin') : t('pin')}
                </button>
                {isOwner && (
                  <>
                    <button
                      onClick={() => {
                        setEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => {
                        deleteMutation.mutate();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[var(--error)] hover:bg-[var(--bg-hover)]"
                    >
                      {t('delete')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommentSection({ cardId }: Props) {
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { t } = useTranslation('comment');
  const { t: tc } = useTranslation('common');
  const [newComment, setNewComment] = useState('');

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ['comments', 'card', cardId],
    queryFn: () => commentsApi.getByCardId(cardId),
  });

  const createMutation = useMutation({
    mutationFn: (content: string) => commentsApi.create(cardId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', 'card', cardId] });
      setNewComment('');
    },
  });

  const handleSubmit = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  };

  const pinnedComments = comments.filter((c) => c.isPinned && c.parentCommentId === null);
  const topLevelComments = comments.filter((c) => !c.isPinned && c.parentCommentId === null);

  return (
    <div className="space-y-4">
      {/* New comment input */}
      <div className="flex items-start gap-2">
        {currentUser && <Avatar name={currentUser.name} />}
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={t('placeholder')}
            rows={2}
            className="w-full text-sm border border-[var(--border-primary)] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] resize-none bg-[var(--bg-primary)] text-[var(--text-primary)]"
          />
          {newComment.trim() && (
            <div className="flex justify-end mt-1 gap-2">
              <button
                onClick={() => setNewComment('')}
                className="px-3 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {tc('cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {t('send')}
              </button>
            </div>
          )}
        </div>
      </div>

      {isLoading && <div className="text-sm text-[var(--text-tertiary)]">{tc('loading')}</div>}

      {/* Pinned comments */}
      {pinnedComments.length > 0 && (
        <div className="box-gradient-border p-3 space-y-3">
          <p className="text-xs font-medium text-[var(--accent)] flex items-center gap-1">
            <span>📌</span> {t('pinned')}
          </p>
          {pinnedComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              cardId={cardId}
              currentUserId={currentUser?.id}
            />
          ))}
        </div>
      )}

      {/* Regular comments */}
      <div className="space-y-4">
        {topLevelComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            cardId={cardId}
            currentUserId={currentUser?.id}
          />
        ))}
        {!isLoading && comments.length === 0 && (
          <p className="text-sm text-[var(--text-tertiary)] italic">{t('noComments')}</p>
        )}
      </div>
    </div>
  );
}
