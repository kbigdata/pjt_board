import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import apiClient from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import CommentSection from '@/components/CommentSection';

const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-[var(--error)] bg-[var(--error-light)]',
  HIGH: 'text-[var(--warning)] bg-[var(--warning-light)]',
  MEDIUM: 'text-[var(--accent)] bg-[var(--accent-light)]',
  LOW: 'text-[var(--text-secondary)] bg-[var(--bg-secondary)]',
};

interface CardDetailData {
  id: string;
  boardId: string;
  columnId: string;
  cardNumber: number;
  title: string;
  description: string | null;
  priority: string;
  position: number;
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  column: { id: string; title: string; columnType: string };
  swimlane?: { id: string; title: string } | null;
  createdBy: { id: string; name: string; avatarUrl: string | null };
  assignees: Array<{ user: { id: string; name: string; email: string; avatarUrl: string | null } }>;
  labels: Array<{ label: { id: string; name: string; color: string } }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string; avatarUrl: string | null };
  }>;
  checklists: Array<{
    id: string;
    title: string;
    items: Array<{ id: string; title: string; isChecked: boolean }>;
  }>;
  tags: Array<{ id: string; tag: string }>;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

type Tab = 'description' | 'comments' | 'checklists' | 'attachments';

interface Props {
  cardId: string;
}

export default function CardDetail({ cardId }: Props) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const { activeTab, setActiveTab } = useUIStore();
  const { t } = useTranslation('card');
  const { t: tc } = useTranslation('common');

  const { data: card, isLoading } = useQuery<CardDetailData>({
    queryKey: ['card', cardId],
    queryFn: () => apiClient.get(`/cards/${cardId}`).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`/cards/${cardId}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
      if (card?.boardId) {
        queryClient.invalidateQueries({ queryKey: ['cards', card.boardId] });
      }
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiClient.patch(`/checklist-items/${itemId}/toggle`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
    },
  });

  void currentUser;

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  if (isLoading) {
    return <div className="p-4 text-sm text-[var(--text-tertiary)]">{tc('loading')}</div>;
  }

  if (!card) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'description', label: t('tabs.description') },
    { id: 'comments', label: t('tabs.comments') },
    { id: 'checklists', label: t('tabs.checklist') },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Card header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-[var(--text-tertiary)] font-mono">
            KF-{String(card.cardNumber).padStart(3, '0')}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">in {card.column.title}</span>
        </div>

        {/* Editable title */}
        {editingTitle ? (
          <input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={() => {
              if (titleValue.trim() && titleValue !== card.title) {
                updateMutation.mutate({ title: titleValue.trim() });
              }
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
              if (e.key === 'Escape') {
                setEditingTitle(false);
              }
            }}
            className="w-full text-base font-semibold text-[var(--text-primary)] border-b-2 border-blue-500 focus:outline-none bg-transparent"
          />
        ) : (
          <h2
            className="text-base font-semibold text-[var(--text-primary)] cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => {
              setTitleValue(card.title);
              setEditingTitle(true);
            }}
          >
            {card.title}
          </h2>
        )}
      </div>

      {/* Property grid */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm border-b border-[var(--border-primary)]">
        {/* Priority */}
        <div>
          <label className="text-xs text-[var(--text-tertiary)] block mb-0.5">{t('props.priority')}</label>
          <select
            value={card.priority}
            onChange={(e) => updateMutation.mutate({ priority: e.target.value })}
            className={`text-xs rounded px-1.5 py-0.5 border-0 focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] cursor-pointer ${PRIORITY_COLORS[card.priority] ?? 'text-gray-600 bg-gray-50'}`}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Status (column) */}
        <div>
          <label className="text-xs text-[var(--text-tertiary)] block mb-0.5">{t('props.status')}</label>
          <span className="text-xs text-[var(--text-primary)] bg-[var(--bg-tertiary)] rounded px-1.5 py-0.5">
            {card.column.title}
          </span>
        </div>

        {/* Assignees */}
        <div>
          <label className="text-xs text-[var(--text-tertiary)] block mb-0.5">{t('props.assignee')}</label>
          {card.assignees.length === 0 ? (
            <span className="text-xs text-[var(--text-tertiary)]">—</span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              {card.assignees.map((a) => (
                <div
                  key={a.user.id}
                  className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold"
                  title={a.user.name}
                >
                  {a.user.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Labels */}
        <div>
          <label className="text-xs text-[var(--text-tertiary)] block mb-0.5">{t('props.label')}</label>
          {card.labels.length === 0 ? (
            <span className="text-xs text-[var(--text-tertiary)]">—</span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              {card.labels.map((cl) => (
                <span
                  key={cl.label.id}
                  className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                  style={{ backgroundColor: cl.label.color }}
                >
                  {cl.label.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Due date */}
        <div className="col-span-2">
          <label className="text-xs text-[var(--text-tertiary)] block mb-0.5">{t('props.dueDate')}</label>
          <input
            type="datetime-local"
            defaultValue={toDatetimeLocal(card.dueDate)}
            onBlur={(e) => {
              const val = e.target.value;
              updateMutation.mutate({ dueDate: val ? new Date(val).toISOString() : null });
            }}
            className="text-xs border border-[var(--border-primary)] rounded px-1.5 py-0.5 bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-primary)] px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'description' && (
          <DescriptionTab
            value={card.description}
            onSave={(desc) => updateMutation.mutate({ description: desc })}
          />
        )}

        {activeTab === 'comments' && <CommentSection cardId={cardId} />}

        {activeTab === 'checklists' && (
          <ChecklistsTab
            checklists={card.checklists}
            onToggleItem={(itemId) => toggleItemMutation.mutate(itemId)}
          />
        )}
      </div>
    </div>
  );
}

function DescriptionTab({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (desc: string) => void;
}) {
  const { t: tc } = useTranslation('common');
  const { t } = useTranslation('card');
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? '');

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full min-h-[120px] text-sm border border-[var(--border-primary)] rounded p-2 bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] resize-y"
          placeholder={t('descriptionPlaceholder')}
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              onSave(text);
              setEditing(false);
            }}
            className="px-3 py-1 text-xs bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)]"
          >
            {tc('save')}
          </button>
          <button
            onClick={() => {
              setText(value ?? '');
              setEditing(false);
            }}
            className="px-3 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {tc('cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        setText(value ?? '');
        setEditing(true);
      }}
      className="min-h-[80px] text-sm text-[var(--text-primary)] cursor-pointer hover:bg-[var(--bg-hover)] rounded p-2 -mx-2"
    >
      {value ? (
        <p className="whitespace-pre-wrap">{value}</p>
      ) : (
        <p className="text-[var(--text-tertiary)] italic">{t('descriptionPlaceholder')}</p>
      )}
    </div>
  );
}

function ChecklistsTab({
  checklists,
  onToggleItem,
}: {
  checklists: CardDetailData['checklists'];
  onToggleItem: (itemId: string) => void;
}) {
  const { t } = useTranslation('card');

  if (checklists.length === 0) {
    return <p className="text-sm text-[var(--text-tertiary)] italic">{t('tabs.checklist')}</p>;
  }

  return (
    <div className="space-y-4">
      {checklists.map((cl) => {
        const checked = cl.items.filter((i) => i.isChecked).length;
        const total = cl.items.length;
        const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

        return (
          <div key={cl.id}>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium text-[var(--text-primary)]">{cl.title}</h4>
              <span className="text-xs text-[var(--text-tertiary)]">
                {checked}/{total}
              </span>
            </div>
            {total > 0 && (
              <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            <div className="space-y-1">
              {cl.items.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 py-1 px-1 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={item.isChecked}
                    onChange={() => onToggleItem(item.id)}
                    className="rounded border-[var(--border-secondary)]"
                  />
                  <span
                    className={`text-sm ${item.isChecked ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}
                  >
                    {item.title}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
