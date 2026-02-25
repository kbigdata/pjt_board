import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: { id: string; name: string };
}

interface Props {
  reactions: Reaction[];
  onAdd: (emoji: string) => void;
  onRemove: (emoji: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😄', '🎉', '😮', '😢', '👀', '🚀'];

export default function EmojiReactionBadge({ reactions, onAdd, onRemove }: Props) {
  const currentUser = useAuthStore((s) => s.user);
  const [showPicker, setShowPicker] = useState(false);

  // Group reactions by emoji
  const grouped = reactions.reduce<Record<string, { count: number; users: string[]; hasCurrentUser: boolean }>>(
    (acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { count: 0, users: [], hasCurrentUser: false };
      }
      acc[r.emoji].count++;
      acc[r.emoji].users.push(r.user.name);
      if (currentUser && r.userId === currentUser.id) {
        acc[r.emoji].hasCurrentUser = true;
      }
      return acc;
    },
    {},
  );

  const handleToggle = (emoji: string) => {
    const group = grouped[emoji];
    if (group?.hasCurrentUser) {
      onRemove(emoji);
    } else {
      onAdd(emoji);
    }
  };

  const handlePickerAdd = (emoji: string) => {
    setShowPicker(false);
    if (grouped[emoji]?.hasCurrentUser) return;
    onAdd(emoji);
  };

  return (
    <div className="relative flex items-center gap-1 flex-wrap mt-1">
      {Object.entries(grouped).map(([emoji, data]) => (
        <button
          key={emoji}
          onClick={() => handleToggle(emoji)}
          title={data.users.join(', ')}
          className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
            data.hasCurrentUser
              ? 'bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)] ring-1 ring-[var(--accent)]'
              : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <span>{emoji}</span>
          <span>{data.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker((prev) => !prev)}
          className="text-xs px-1.5 py-0.5 rounded-full border border-[var(--border-primary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          +
        </button>
        {showPicker && (
          <div className="dropdown-menu absolute bottom-full left-0 mb-1 p-2 flex gap-1 flex-wrap w-44 z-20">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handlePickerAdd(emoji)}
                className="text-lg hover:bg-[var(--bg-hover)] rounded p-1 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
