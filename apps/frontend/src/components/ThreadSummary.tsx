import { useUIStore } from '@/stores/ui';

interface Props {
  commentId: string;
  replyCount: number;
  lastReplyUser?: { id: string; name: string; avatarUrl: string | null } | null;
}

export default function ThreadSummary({ commentId, replyCount, lastReplyUser }: Props) {
  const openThread = useUIStore((s) => s.openThread);

  if (replyCount === 0) return null;

  return (
    <button
      onClick={() => openThread(commentId)}
      className="flex items-center gap-2 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] mt-2 hover:bg-[var(--bg-hover)] px-2 py-1 rounded"
    >
      <span>💬 {replyCount}개의 답글</span>
      {lastReplyUser && <span className="text-[var(--text-secondary)]">최신: {lastReplyUser.name}</span>}
    </button>
  );
}
