import { useState, useMemo } from 'react';
import { type Card, type Column } from '@/api/boards';

type SortKey = 'title' | 'column' | 'priority' | 'dueDate' | 'status';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  LOW: 'bg-gray-100 text-gray-500',
};

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDueDateClass(dueDate: string | null, columnType?: string): string {
  if (!dueDate) return '';
  if (columnType === 'DONE') return 'text-green-600';
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  if (diffMs < 0) return 'text-red-600 font-semibold';
  if (diffMs < 24 * 60 * 60 * 1000) return 'text-amber-600 font-semibold';
  return 'text-gray-600';
}

interface ListViewProps {
  cards: Card[];
  columns: Column[];
  onCardClick: (cardId: string) => void;
}

export default function ListView({ cards, columns, onCardClick }: ListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const columnMap = useMemo(
    () => new Map(columns.map((c) => [c.id, c])),
    [columns],
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedCards = useMemo(() => {
    const copy = [...cards];
    const dir = sortDir === 'asc' ? 1 : -1;

    copy.sort((a, b) => {
      switch (sortKey) {
        case 'title':
          return dir * a.title.localeCompare(b.title);
        case 'column': {
          const colA = columnMap.get(a.columnId)?.title ?? '';
          const colB = columnMap.get(b.columnId)?.title ?? '';
          return dir * colA.localeCompare(colB);
        }
        case 'priority': {
          const orderA = PRIORITY_ORDER[a.priority] ?? 99;
          const orderB = PRIORITY_ORDER[b.priority] ?? 99;
          return dir * (orderA - orderB);
        }
        case 'dueDate': {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return dir * (da - db);
        }
        case 'status': {
          const colA = columnMap.get(a.columnId)?.columnType ?? '';
          const colB = columnMap.get(b.columnId)?.columnType ?? '';
          return dir * colA.localeCompare(colB);
        }
        default:
          return 0;
      }
    });

    return copy;
  }, [cards, sortKey, sortDir, columnMap]);

  const SortHeader = ({ label, keyName }: { label: string; keyName: SortKey }) => (
    <th
      className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 whitespace-nowrap"
      onClick={() => handleSort(keyName)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === keyName && (
          <span className="text-blue-500">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
        )}
      </span>
    </th>
  );

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No cards match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <tr>
            <SortHeader label="Title" keyName="title" />
            <SortHeader label="Column" keyName="column" />
            <SortHeader label="Priority" keyName="priority" />
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Assignees
            </th>
            <SortHeader label="Due Date" keyName="dueDate" />
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Labels
            </th>
            <SortHeader label="Status" keyName="status" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedCards.map((card) => {
            const col = columnMap.get(card.columnId);
            const dueCls = getDueDateClass(card.dueDate, col?.columnType);

            return (
              <tr
                key={card.id}
                onClick={() => onCardClick(card.id)}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
              >
                {/* Title */}
                <td className="px-3 py-2.5 max-w-xs">
                  <div className="flex items-start gap-2">
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-[16rem]">{card.title}</p>
                      <span className="text-xs text-gray-400">
                        KF-{String(card.cardNumber).padStart(3, '0')}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Column */}
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">
                  <div className="flex items-center gap-1.5">
                    {col?.color && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: col.color }}
                      />
                    )}
                    {col?.title ?? '-'}
                  </div>
                </td>

                {/* Priority */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[card.priority] ?? 'bg-gray-100 text-gray-500'}`}
                  >
                    {card.priority}
                  </span>
                </td>

                {/* Assignees */}
                <td className="px-3 py-2.5">
                  {card.assignees && card.assignees.length > 0 ? (
                    <div className="flex -space-x-1">
                      {card.assignees.slice(0, 4).map((a) => (
                        <div
                          key={a.user.id}
                          className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
                          title={a.user.name}
                        >
                          {a.user.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {card.assignees.length > 4 && (
                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white">
                          +{card.assignees.length - 4}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>

                {/* Due Date */}
                <td className={`px-3 py-2.5 whitespace-nowrap text-sm ${dueCls || 'text-gray-600'}`}>
                  {formatDate(card.dueDate)}
                </td>

                {/* Labels */}
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1 max-w-[12rem]">
                    {card.labels && card.labels.length > 0 ? (
                      card.labels.map((cl) => (
                        <span
                          key={cl.label.id}
                          className="text-xs px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: cl.label.color }}
                        >
                          {cl.label.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </div>
                </td>

                {/* Status (column type) */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="text-xs text-gray-500">{col?.columnType ?? '-'}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
