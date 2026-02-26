import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type Card } from '@/api/boards';

interface SprintBacklogProps {
  cards: Card[];
  onAddToSprint: (cardIds: string[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function SprintBacklog({ cards, onAddToSprint, isOpen, onToggle }: SprintBacklogProps) {
  const { t } = useTranslation('sprint');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const backlogCards = useMemo(() => {
    const filtered = cards.filter((c) => !c.sprintId);
    if (!search) return filtered;
    const q = search.toLowerCase();
    return filtered.filter((c) => c.title.toLowerCase().includes(q));
  }, [cards, search]);

  const toggleCard = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    if (selectedIds.size > 0) {
      onAddToSprint(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded border border-[var(--border-secondary)]"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {t('backlog')} ({cards.filter((c) => !c.sprintId).length})
      </button>
    );
  }

  return (
    <div className="w-72 flex-shrink-0 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-primary)]">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">{t('backlog')}</h3>
        <button onClick={onToggle} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="px-3 py-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchBacklog')}
          className="w-full px-2 py-1 text-sm rounded border border-[var(--border-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="px-3 py-1">
          <button
            onClick={handleAdd}
            className="w-full text-xs px-2 py-1.5 rounded bg-[var(--accent)] text-white hover:opacity-90"
          >
            {t('addToSprint')} ({selectedIds.size})
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        {backlogCards.map((card) => (
          <button
            key={card.id}
            onClick={() => toggleCard(card.id)}
            className={`w-full text-left px-2 py-1.5 rounded text-sm border ${
              selectedIds.has(card.id)
                ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                : 'border-transparent hover:bg-[var(--bg-hover)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-tertiary)]">KF-{card.cardNumber}</span>
              <span className="text-[var(--text-primary)] truncate">{card.title}</span>
            </div>
          </button>
        ))}
        {backlogCards.length === 0 && (
          <p className="text-xs text-[var(--text-tertiary)] text-center py-4">{t('noCards')}</p>
        )}
      </div>
    </div>
  );
}
