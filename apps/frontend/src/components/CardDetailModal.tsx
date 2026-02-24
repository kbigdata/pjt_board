import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { useAttachments } from '@/hooks/useAttachments';
import { attachmentsApi } from '@/api/attachments';
import { cardLinksApi, type CardLink } from '@/api/card-links';
import { commentsApi } from '@/api/comments';
import { boardsApi } from '@/api/boards';
import { useAuthStore } from '@/stores/auth';
import { customFieldsApi, type CustomFieldDefinition, type CustomFieldValue } from '@/api/custom-fields';
import { recurringApi, type RecurringConfig } from '@/api/recurring';

const LABEL_PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#a855f7', '#ec4899', '#6b7280',
];

interface CardDetail {
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

const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const LINK_TYPES = ['BLOCKS', 'BLOCKED_BY', 'RELATES_TO', 'DUPLICATES'] as const;

/** Returns the due-date CSS class based on urgency and column type. */
function getDueDateClass(dueDate: string | null, columnType: string): string {
  if (!dueDate) return 'text-gray-500';
  if (columnType === 'DONE') return 'text-green-600';
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  if (diffMs < 0) return 'text-red-600 font-semibold';
  if (diffMs < 24 * 60 * 60 * 1000) return 'text-amber-600 font-semibold';
  return 'text-gray-600';
}

/** Formats a UTC date string for a datetime-local input value. */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  // Trim to "YYYY-MM-DDTHH:MM"
  return iso.slice(0, 16);
}

export default function CardDetailModal({
  cardId,
  onClose,
}: {
  cardId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const backdropRef = useRef<HTMLDivElement>(null);
  const currentUser = useAuthStore((s) => s.user);

  const { data: card, isLoading } = useQuery<CardDetail>({
    queryKey: ['card', cardId],
    queryFn: () => apiClient.get(`/cards/${cardId}`).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`/cards/${cardId}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
      queryClient.invalidateQueries({ queryKey: ['cards', card?.boardId] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) =>
      apiClient.post(`/cards/${cardId}/comments`, { content }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      commentsApi.update(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: string) => commentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiClient.patch(`/checklist-items/${itemId}/toggle`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
    },
  });

  const addTagMutation = useMutation({
    mutationFn: (tag: string) =>
      apiClient.post(`/cards/${cardId}/tags`, { tag }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: (tag: string) =>
      apiClient.delete(`/cards/${cardId}/tags/${encodeURIComponent(tag)}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
    },
  });

  const addLinkMutation = useMutation({
    mutationFn: (data: { targetCardId: string; linkType: string }) =>
      cardLinksApi.create(cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-links', cardId] });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (linkId: string) => cardLinksApi.delete(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-links', cardId] });
    },
  });

  const addLabelToCardMutation = useMutation({
    mutationFn: (labelId: string) => boardsApi.addLabelToCard(cardId, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
      queryClient.invalidateQueries({ queryKey: ['cards', card?.boardId] });
    },
  });

  const removeLabelFromCardMutation = useMutation({
    mutationFn: (labelId: string) => boardsApi.removeLabelFromCard(cardId, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
      queryClient.invalidateQueries({ queryKey: ['cards', card?.boardId] });
    },
  });

  const copyCardMutation = useMutation({
    mutationFn: () => boardsApi.copyCard(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', card?.boardId] });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: () => boardsApi.deleteCard(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', card?.boardId] });
      onClose();
    },
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  if (isLoading) {
    return (
      <div
        ref={backdropRef}
        onClick={handleBackdropClick}
        className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16"
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!card) return null;

  const columnType = card.column?.columnType ?? '';

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16 overflow-y-auto"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mb-16">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-400">
                KF-{String(card.cardNumber).padStart(3, '0')}
              </span>
              <span className="text-xs text-gray-400">in {card.column.title}</span>
            </div>
            <EditableTitle
              value={card.title}
              onSave={(title) => updateMutation.mutate({ title })}
            />
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-6 pb-6 grid grid-cols-3 gap-6">
          {/* Main content - left 2/3 */}
          <div className="col-span-2 space-y-5">
            {/* LB-005, LB-006: Labels with editing */}
            <LabelsSection
              cardId={cardId}
              boardId={card.boardId}
              cardLabels={card.labels}
              onAddLabel={(labelId) => addLabelToCardMutation.mutate(labelId)}
              onRemoveLabel={(labelId) => removeLabelFromCardMutation.mutate(labelId)}
            />

            {/* Description */}
            <EditableDescription
              value={card.description}
              onSave={(description) => updateMutation.mutate({ description })}
            />

            {/* Tags section */}
            <TagsSection
              tags={card.tags}
              onAdd={(tag) => addTagMutation.mutate(tag)}
              onRemove={(tag) => removeTagMutation.mutate(tag)}
            />

            {/* Custom Fields section */}
            <CustomFieldsSection cardId={cardId} boardId={card.boardId} />

            {/* Links section */}
            <LinksSection
              cardId={cardId}
              onAddLink={(data) => addLinkMutation.mutate(data)}
              onDeleteLink={(id) => deleteLinkMutation.mutate(id)}
            />

            {/* Checklists */}
            {card.checklists.map((cl) => (
              <div key={cl.id}>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{cl.title}</h4>
                {cl.items.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">
                        {cl.items.filter((i) => i.isChecked).length}/{cl.items.length} completed
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(
                          (cl.items.filter((i) => i.isChecked).length / cl.items.length) * 100,
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{
                          width: `${(cl.items.filter((i) => i.isChecked).length / cl.items.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  {cl.items.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={item.isChecked}
                        onChange={() => toggleItemMutation.mutate(item.id)}
                        className="rounded border-gray-300"
                      />
                      <span
                        className={`text-sm ${item.isChecked ? 'line-through text-gray-400' : 'text-gray-700'}`}
                      >
                        {item.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Attachments */}
            <AttachmentSection cardId={card.id} />

            {/* Comments */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Comments</h4>
              <CommentInput onSubmit={(c) => addCommentMutation.mutate(c)} />
              <div className="space-y-3 mt-3">
                {card.comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    currentUserId={currentUser?.id}
                    onUpdate={(content) =>
                      updateCommentMutation.mutate({ id: comment.id, content })
                    }
                    onDelete={() => deleteCommentMutation.mutate(comment.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - right 1/3 */}
          <div className="space-y-4">
            {/* Priority */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Priority</h4>
              <select
                value={card.priority}
                onChange={(e) => updateMutation.mutate({ priority: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignees */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Assignees</h4>
              {card.assignees.length === 0 ? (
                <p className="text-xs text-gray-400">None</p>
              ) : (
                <div className="space-y-1">
                  {card.assignees.map((a) => (
                    <div key={a.user.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                        {a.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700">{a.user.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dates - datetime-local inputs */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Dates</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Start date</label>
                  <input
                    type="datetime-local"
                    defaultValue={toDatetimeLocal(card.startDate)}
                    onBlur={(e) => {
                      const val = e.target.value;
                      updateMutation.mutate({ startDate: val ? new Date(val).toISOString() : null });
                    }}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Due date</label>
                  <input
                    type="datetime-local"
                    defaultValue={toDatetimeLocal(card.dueDate)}
                    onBlur={(e) => {
                      const val = e.target.value;
                      updateMutation.mutate({ dueDate: val ? new Date(val).toISOString() : null });
                    }}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {card.dueDate && (
                    <p className={`text-xs mt-0.5 ${getDueDateClass(card.dueDate, columnType)}`}>
                      {new Date(card.dueDate).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Work hours */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Work Hours</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Estimated (h)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    defaultValue={card.estimatedHours ?? ''}
                    onBlur={(e) => {
                      const val = e.target.value;
                      updateMutation.mutate({
                        estimatedHours: val !== '' ? parseFloat(val) : null,
                      });
                    }}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Actual (h)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    defaultValue={card.actualHours ?? ''}
                    onBlur={(e) => {
                      const val = e.target.value;
                      updateMutation.mutate({
                        actualHours: val !== '' ? parseFloat(val) : null,
                      });
                    }}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Actions</h4>
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    if (copyCardMutation.isPending) return;
                    copyCardMutation.mutate();
                  }}
                  disabled={copyCardMutation.isPending}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 disabled:opacity-50"
                >
                  {copyCardMutation.isPending ? 'Copying...' : 'Copy card'}
                </button>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete card "KF-${String(card.cardNumber).padStart(3, '0')}: ${card.title}"? This action cannot be undone.`,
                      )
                    ) {
                      deleteCardMutation.mutate();
                    }
                  }}
                  disabled={deleteCardMutation.isPending}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 disabled:opacity-50"
                >
                  {deleteCardMutation.isPending ? 'Deleting...' : 'Delete card'}
                </button>
              </div>
            </div>

            {/* Recurring */}
            <RecurringSection cardId={cardId} />

            {/* Meta */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Created by</h4>
              <p className="text-sm text-gray-700">{card.createdBy.name}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LB-005, LB-006: Labels section with create/edit
// ---------------------------------------------------------------------------

function LabelsSection({
  cardId,
  boardId,
  cardLabels,
  onAddLabel,
  onRemoveLabel,
}: {
  cardId: string;
  boardId: string;
  cardLabels: Array<{ label: { id: string; name: string; color: string } }>;
  onAddLabel: (labelId: string) => void;
  onRemoveLabel: (labelId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_PRESET_COLORS[0]);
  const [editingLabel, setEditingLabel] = useState<{ id: string; name: string; color: string } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const { data: boardLabels = [] } = useQuery<Array<{ id: string; name: string; color: string }>>({
    queryKey: ['board-labels', boardId],
    queryFn: () => boardsApi.getBoardLabels(boardId),
    enabled: showPicker,
  });

  const createLabelMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) => boardsApi.createLabel(boardId, data),
    onSuccess: (newLabel) => {
      queryClient.invalidateQueries({ queryKey: ['board-labels', boardId] });
      onAddLabel(newLabel.id);
      setShowCreate(false);
      setNewLabelName('');
      setNewLabelColor(LABEL_PRESET_COLORS[0]);
    },
  });

  const updateLabelMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; color?: string } }) =>
      boardsApi.updateLabel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-labels', boardId] });
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
      setEditingLabel(null);
    },
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
        setShowCreate(false);
        setEditingLabel(null);
      }
    }
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  const cardLabelIds = new Set(cardLabels.map((cl) => cl.label.id));

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <h4 className="text-sm font-medium text-gray-700">Labels</h4>
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {showPicker ? 'Close' : '+ Add'}
        </button>
      </div>

      {/* Current card labels */}
      {cardLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {cardLabels.map((cl) => (
            <span
              key={cl.label.id}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded text-white font-medium"
              style={{ backgroundColor: cl.label.color }}
            >
              {cl.label.name}
              <button
                onClick={() => onRemoveLabel(cl.label.id)}
                className="hover:opacity-70 leading-none ml-0.5"
                aria-label={`Remove label ${cl.label.name}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Label picker dropdown */}
      {showPicker && (
        <div ref={pickerRef} className="border border-gray-200 rounded-lg shadow-sm bg-white p-3 mb-2">
          {editingLabel ? (
            /* Edit label form */
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setEditingLabel(null)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  &larr;
                </button>
                <span className="text-xs font-medium text-gray-700">Edit label</span>
              </div>
              <input
                type="text"
                value={editingLabel.name}
                onChange={(e) => setEditingLabel({ ...editingLabel, name: e.target.value })}
                placeholder="Label name"
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5 mb-2">
                {LABEL_PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditingLabel({ ...editingLabel, color: c })}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: editingLabel.color === c ? '#1d4ed8' : 'transparent',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  updateLabelMutation.mutate({
                    id: editingLabel.id,
                    data: { name: editingLabel.name, color: editingLabel.color },
                  })
                }
                disabled={updateLabelMutation.isPending || !editingLabel.name.trim()}
                className="w-full py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
              >
                {updateLabelMutation.isPending ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          ) : showCreate ? (
            /* Create label form */
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  &larr;
                </button>
                <span className="text-xs font-medium text-gray-700">Create label</span>
              </div>
              <input
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Label name"
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5 mb-2">
                {LABEL_PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewLabelColor(c)}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: newLabelColor === c ? '#1d4ed8' : 'transparent',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  createLabelMutation.mutate({ name: newLabelName.trim(), color: newLabelColor })
                }
                disabled={createLabelMutation.isPending || !newLabelName.trim()}
                className="w-full py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
              >
                {createLabelMutation.isPending ? 'Creating...' : 'Create label'}
              </button>
            </div>
          ) : (
            /* Label list */
            <div>
              <div className="space-y-1 max-h-40 overflow-y-auto mb-2">
                {boardLabels.map((label) => {
                  const isOnCard = cardLabelIds.has(label.id);
                  return (
                    <div key={label.id} className="flex items-center justify-between group">
                      <button
                        onClick={() =>
                          isOnCard ? onRemoveLabel(label.id) : onAddLabel(label.id)
                        }
                        className="flex items-center gap-2 flex-1 min-w-0 text-left py-1 px-1 rounded hover:bg-gray-50"
                      >
                        <span
                          className="inline-block text-xs px-2 py-0.5 rounded text-white font-medium truncate"
                          style={{ backgroundColor: label.color }}
                        >
                          {label.name}
                        </span>
                        {isOnCard && (
                          <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => setEditingLabel(label)}
                        className="text-gray-300 hover:text-gray-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit label"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
                {boardLabels.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No labels yet.</p>
                )}
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="w-full text-xs text-center py-1.5 border border-dashed border-gray-300 rounded text-gray-500 hover:border-gray-400 hover:text-gray-700"
              >
                + Create new label
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tags section
// ---------------------------------------------------------------------------

function TagsSection({
  tags,
  onAdd,
  onRemove,
}: {
  tags: Array<{ id: string; tag: string }>;
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed && !tags.some((t) => t.tag === trimmed)) {
        onAdd(trimmed);
        setInputValue('');
      }
    }
  };

  // Simple deterministic color palette for tags
  const TAG_COLORS = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700',
  ];

  const colorFor = (tag: string) =>
    TAG_COLORS[
      tag.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % TAG_COLORS.length
    ];

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span
            key={t.id}
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${colorFor(t.tag)}`}
          >
            {t.tag}
            <button
              onClick={() => onRemove(t.tag)}
              className="hover:opacity-70 leading-none"
              aria-label={`Remove tag ${t.tag}`}
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add tag, press Enter..."
        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CF-001: Custom Fields section
// ---------------------------------------------------------------------------

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  DATE: 'Date',
  DROPDOWN: 'Dropdown',
  CHECKBOX: 'Checkbox',
};

function CustomFieldInput({
  definition,
  value,
  onSave,
  onDelete,
}: {
  definition: CustomFieldDefinition;
  value: CustomFieldValue | undefined;
  onSave: (val: unknown) => void;
  onDelete: () => void;
}) {
  const currentValue = value?.value;

  if (definition.fieldType === 'CHECKBOX') {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(currentValue)}
          onChange={(e) => onSave(e.target.checked)}
          className="rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">{definition.name}</span>
        {definition.isRequired && <span className="text-red-400 text-xs">*</span>}
        <button
          onClick={onDelete}
          className="ml-auto text-gray-300 hover:text-red-400 text-xs"
          title="Clear value"
        >
          &times;
        </button>
      </label>
    );
  }

  if (definition.fieldType === 'DROPDOWN') {
    const opts = definition.options ?? [];
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 flex-shrink-0 w-28 truncate" title={definition.name}>
          {definition.name}
          {definition.isRequired && <span className="text-red-400"> *</span>}
        </label>
        <select
          value={(currentValue as string) ?? ''}
          onChange={(e) => onSave(e.target.value || null)}
          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">-- Select --</option>
          {opts.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0"
          title="Clear value"
        >
          &times;
        </button>
      </div>
    );
  }

  if (definition.fieldType === 'DATE') {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 flex-shrink-0 w-28 truncate" title={definition.name}>
          {definition.name}
          {definition.isRequired && <span className="text-red-400"> *</span>}
        </label>
        <input
          type="date"
          defaultValue={(currentValue as string) ?? ''}
          onBlur={(e) => onSave(e.target.value || null)}
          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0"
          title="Clear value"
        >
          &times;
        </button>
      </div>
    );
  }

  if (definition.fieldType === 'NUMBER') {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 flex-shrink-0 w-28 truncate" title={definition.name}>
          {definition.name}
          {definition.isRequired && <span className="text-red-400"> *</span>}
        </label>
        <input
          type="number"
          defaultValue={(currentValue as number) ?? ''}
          onBlur={(e) => onSave(e.target.value !== '' ? Number(e.target.value) : null)}
          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter number..."
        />
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0"
          title="Clear value"
        >
          &times;
        </button>
      </div>
    );
  }

  // Default: TEXT
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 flex-shrink-0 w-28 truncate" title={definition.name}>
        {definition.name}
        {definition.isRequired && <span className="text-red-400"> *</span>}
      </label>
      <input
        type="text"
        defaultValue={(currentValue as string) ?? ''}
        onBlur={(e) => onSave(e.target.value.trim() || null)}
        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder="Enter text..."
      />
      <button
        onClick={onDelete}
        className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0"
        title="Clear value"
      >
        &times;
      </button>
    </div>
  );
}

function CustomFieldManager({
  boardId,
  onClose,
}: {
  boardId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<string>('TEXT');
  const [newOptions, setNewOptions] = useState('');
  const [newRequired, setNewRequired] = useState(false);

  const { data: defs = [] } = useQuery<CustomFieldDefinition[]>({
    queryKey: ['custom-field-defs', boardId],
    queryFn: () => customFieldsApi.getDefinitions(boardId),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; fieldType: string; options?: string[]; isRequired?: boolean }) =>
      customFieldsApi.createDefinition(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-defs', boardId] });
      setShowCreate(false);
      setNewName('');
      setNewType('TEXT');
      setNewOptions('');
      setNewRequired(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customFieldsApi.deleteDefinition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-defs', boardId] });
    },
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    const options =
      (newType === 'DROPDOWN' && newOptions.trim())
        ? newOptions.split(',').map((o) => o.trim()).filter(Boolean)
        : undefined;
    createMutation.mutate({ name: newName.trim(), fieldType: newType, options, isRequired: newRequired });
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700">Manage Custom Fields</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">Close</button>
      </div>

      {/* Existing fields */}
      <div className="space-y-1 mb-3">
        {defs.map((def) => (
          <div key={def.id} className="flex items-center justify-between py-1 px-2 bg-white rounded border border-gray-200">
            <span className="text-xs text-gray-700 font-medium">{def.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{FIELD_TYPE_LABELS[def.fieldType]}</span>
              {def.isRequired && <span className="text-xs text-red-400">Required</span>}
              <button
                onClick={() => {
                  if (window.confirm(`Delete field "${def.name}"?`)) {
                    deleteMutation.mutate(def.id);
                  }
                }}
                className="text-gray-300 hover:text-red-500 text-xs"
                title="Delete field"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {defs.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">No custom fields defined.</p>
        )}
      </div>

      {/* Create new field */}
      {showCreate ? (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Field name"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {newType === 'DROPDOWN' && (
            <input
              type="text"
              value={newOptions}
              onChange={(e) => setNewOptions(e.target.value)}
              placeholder="Options (comma separated)"
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          )}
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={newRequired}
              onChange={(e) => setNewRequired(e.target.checked)}
              className="rounded border-gray-300"
            />
            Required field
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending || !newName.trim()}
              className="flex-1 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Field'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="py-1 px-3 text-gray-500 hover:text-gray-700 rounded text-xs border border-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full text-xs text-center py-1.5 border border-dashed border-gray-300 rounded text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          + Add Field
        </button>
      )}
    </div>
  );
}

function CustomFieldsSection({ cardId, boardId }: { cardId: string; boardId: string }) {
  const queryClient = useQueryClient();
  const [showManager, setShowManager] = useState(false);

  const { data: defs = [] } = useQuery<CustomFieldDefinition[]>({
    queryKey: ['custom-field-defs', boardId],
    queryFn: () => customFieldsApi.getDefinitions(boardId),
  });

  const { data: values = [] } = useQuery<CustomFieldValue[]>({
    queryKey: ['custom-field-values', cardId],
    queryFn: () => customFieldsApi.getValues(cardId),
  });

  const setValueMutation = useMutation({
    mutationFn: ({ fieldId, value }: { fieldId: string; value: unknown }) =>
      customFieldsApi.setValue(cardId, fieldId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-values', cardId] });
    },
  });

  const deleteValueMutation = useMutation({
    mutationFn: (fieldId: string) => customFieldsApi.deleteValue(cardId, fieldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-values', cardId] });
    },
  });

  const valueMap = new Map(values.map((v) => [v.fieldId, v]));

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-sm font-medium text-gray-700">Custom Fields</h4>
        <button
          onClick={() => setShowManager((v) => !v)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {showManager ? 'Done' : 'Manage Fields'}
        </button>
      </div>

      {showManager && (
        <CustomFieldManager boardId={boardId} onClose={() => setShowManager(false)} />
      )}

      {defs.length === 0 && !showManager && (
        <p className="text-xs text-gray-400">No custom fields. Click "Manage Fields" to add some.</p>
      )}

      {defs.length > 0 && (
        <div className="space-y-2">
          {defs.map((def) => (
            <CustomFieldInput
              key={def.id}
              definition={def}
              value={valueMap.get(def.id)}
              onSave={(val) => setValueMutation.mutate({ fieldId: def.id, value: val })}
              onDelete={() => deleteValueMutation.mutate(def.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Links section
// ---------------------------------------------------------------------------

const LINK_TYPE_LABELS: Record<string, string> = {
  BLOCKS: 'Blocks',
  BLOCKED_BY: 'Blocked by',
  RELATES_TO: 'Relates to',
  DUPLICATES: 'Duplicates',
};

function LinksSection({
  cardId,
  onAddLink,
  onDeleteLink,
}: {
  cardId: string;
  onAddLink: (data: { targetCardId: string; linkType: string }) => void;
  onDeleteLink: (id: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [targetCardId, setTargetCardId] = useState('');
  const [linkType, setLinkType] = useState<string>('RELATES_TO');

  const { data: links = [] } = useQuery<CardLink[]>({
    queryKey: ['card-links', cardId],
    queryFn: () => cardLinksApi.list(cardId),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCardId.trim()) return;
    onAddLink({ targetCardId: targetCardId.trim(), linkType });
    setTargetCardId('');
    setLinkType('RELATES_TO');
    setIsAdding(false);
  };

  // Group links by type
  const grouped = LINK_TYPES.reduce<Record<string, CardLink[]>>((acc, lt) => {
    acc[lt] = links.filter((l) => l.linkType === lt);
    return acc;
  }, {} as Record<string, CardLink[]>);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">Links</h4>
        <button
          onClick={() => setIsAdding((v) => !v)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {isAdding ? 'Cancel' : '+ Add link'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="flex gap-2 mb-3">
          <input
            type="text"
            value={targetCardId}
            onChange={(e) => setTargetCardId(e.target.value)}
            placeholder="Target card ID..."
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={linkType}
            onChange={(e) => setLinkType(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {LINK_TYPES.map((lt) => (
              <option key={lt} value={lt}>
                {LINK_TYPE_LABELS[lt]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Add
          </button>
        </form>
      )}

      {links.length > 0 && (
        <div className="space-y-2">
          {LINK_TYPES.map((lt) => {
            const items = grouped[lt];
            if (!items || items.length === 0) return null;
            return (
              <div key={lt}>
                <p className="text-xs text-gray-500 font-medium mb-1">{LINK_TYPE_LABELS[lt]}</p>
                <div className="space-y-1">
                  {items.map((link) => {
                    const related =
                      link.sourceCardId === cardId ? link.targetCard : link.sourceCard;
                    return (
                      <div
                        key={link.id}
                        className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded text-sm"
                      >
                        <span className="text-gray-700 truncate">
                          {related
                            ? `KF-${String(related.cardNumber).padStart(3, '0')} ${related.title}`
                            : link.targetCardId}
                        </span>
                        <button
                          onClick={() => onDeleteLink(link.id)}
                          className="ml-2 text-gray-400 hover:text-red-500 text-xs flex-shrink-0"
                          aria-label="Remove link"
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {links.length === 0 && !isAdding && (
        <p className="text-xs text-gray-400">No links yet.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comment item with edit/delete
// ---------------------------------------------------------------------------

function CommentItem({
  comment,
  currentUserId,
  onUpdate,
  onDelete,
}: {
  comment: { id: string; content: string; createdAt: string; author: { id: string; name: string; avatarUrl: string | null } };
  currentUserId: string | undefined;
  onUpdate: (content: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const isAuthor = currentUserId === comment.author.id;

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== comment.content) {
      onUpdate(trimmed);
    }
    setEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Delete this comment?')) {
      onDelete();
    }
  };

  return (
    <div className="flex gap-2">
      <div className="w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
        {comment.author.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{comment.author.name}</span>
          <span className="text-xs text-gray-400">
            {new Date(comment.createdAt).toLocaleDateString('ko-KR')}
          </span>
          {isAuthor && !editing && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => {
                  setEditText(comment.content);
                  setEditing(true);
                }}
                className="text-xs text-gray-400 hover:text-blue-600"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="text-xs text-gray-400 hover:text-red-600"
              >
                Delete
              </button>
            </div>
          )}
        </div>
        {editing ? (
          <div className="mt-1">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleSave}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditText(comment.content);
                  setEditing(false);
                }}
                className="px-3 py-1 text-gray-500 hover:text-gray-700 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 mt-0.5">{comment.content}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attachment section (unchanged from Batch 2)
// ---------------------------------------------------------------------------

function AttachmentSection({ cardId }: { cardId: string }) {
  const { attachments, upload, isUploading, deleteAttachment } = useAttachments(cardId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => upload(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDownload = async (id: string) => {
    const { url } = await attachmentsApi.getDownloadUrl(id);
    window.open(url, '_blank');
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Attachments</h4>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-3 mb-3 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-gray-500">
          {isUploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </p>
      </div>
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              {isImage(att.mimeType) ? (
                <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    IMG
                  </div>
                </div>
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{att.fileName}</p>
                <p className="text-xs text-gray-400">{formatSize(att.fileSize)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDownload(att.id)}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1"
                >
                  Download
                </button>
                <button
                  onClick={() => deleteAttachment(att.id)}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable title
// ---------------------------------------------------------------------------

function EditableTitle({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  const handleSave = () => {
    setEditing(false);
    if (text.trim() && text !== value) {
      onSave(text.trim());
    } else {
      setText(value);
    }
  };

  if (editing) {
    return (
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setText(value);
            setEditing(false);
          }
        }}
        className="text-lg font-semibold text-gray-900 w-full border-b-2 border-blue-500 focus:outline-none bg-transparent"
        autoFocus
      />
    );
  }

  return (
    <h2
      onClick={() => setEditing(true)}
      className="text-lg font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1"
    >
      {value}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// Editable description
// ---------------------------------------------------------------------------

function EditableDescription({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? '');

  const handleSave = () => {
    setEditing(false);
    if (text !== (value ?? '')) {
      onSave(text);
    }
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
      {editing ? (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            autoFocus
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setText(value ?? '');
                setEditing(false);
              }}
              className="px-3 py-1 text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2 min-h-[3rem] cursor-pointer hover:bg-gray-100"
        >
          {value || 'Add a description...'}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recurring section
// ---------------------------------------------------------------------------

const CRON_PRESETS = [
  { label: 'Daily', value: '0 9 * * *' },
  { label: 'Weekly (Mon)', value: '0 9 * * 1' },
  { label: 'Monthly (1st)', value: '0 9 1 * *' },
  { label: 'Custom', value: 'custom' },
];

function RecurringSection({ cardId }: { cardId: string }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(CRON_PRESETS[0].value);
  const [customCron, setCustomCron] = useState('');
  const [nextRunAt, setNextRunAt] = useState('');

  const { data: config, isLoading } = useQuery<RecurringConfig | null>({
    queryKey: ['recurring', cardId],
    queryFn: () => recurringApi.get(cardId),
    enabled: expanded,
  });

  const createMutation = useMutation({
    mutationFn: (data: { cronExpression: string; nextRunAt?: string }) =>
      recurringApi.create(cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring', cardId] });
      setShowSetup(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { cronExpression?: string; nextRunAt?: string; enabled?: boolean }) =>
      recurringApi.update(cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring', cardId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => recurringApi.delete(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring', cardId] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: () => recurringApi.toggle(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring', cardId] });
    },
  });

  const effectiveCron = selectedPreset === 'custom' ? customCron : selectedPreset;

  const handleCreate = () => {
    if (!effectiveCron.trim()) return;
    createMutation.mutate({
      cronExpression: effectiveCron.trim(),
      nextRunAt: nextRunAt ? new Date(nextRunAt).toISOString() : undefined,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-medium text-gray-500 uppercase">Recurring</h4>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {expanded && (
        <div className="mt-1">
          {isLoading ? (
            <p className="text-xs text-gray-400">Loading...</p>
          ) : config ? (
            /* Config exists */
            <div className="space-y-2">
              <div className="p-2 bg-gray-50 rounded border border-gray-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Cron</span>
                  <code className="text-xs font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-700">
                    {config.cronExpression}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Next run</span>
                  <span className="text-xs text-gray-700">
                    {new Date(config.nextRunAt).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Status</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      config.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {config.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => toggleMutation.mutate()}
                  disabled={toggleMutation.isPending}
                  className={`flex-1 text-xs py-1 rounded border transition-colors disabled:opacity-50 ${
                    config.enabled
                      ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      : 'border-green-300 text-green-700 hover:bg-green-50'
                  }`}
                >
                  {config.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete recurring config?')) {
                      deleteMutation.mutate();
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex-1 text-xs py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : showSetup ? (
            /* Setup form */
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {CRON_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              {selectedPreset === 'custom' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cron expression</label>
                  <input
                    type="text"
                    value={customCron}
                    onChange={(e) => setCustomCron(e.target.value)}
                    placeholder="e.g. 0 9 * * 1-5"
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">First run (optional)</label>
                <input
                  type="datetime-local"
                  value={nextRunAt}
                  onChange={(e) => setNextRunAt(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending || !effectiveCron.trim()}
                  className="flex-1 text-xs py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowSetup(false)}
                  className="flex-1 text-xs py-1.5 border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* No config, show setup button */
            <button
              onClick={() => setShowSetup(true)}
              className="w-full text-xs py-1.5 border border-dashed border-gray-300 text-gray-500 rounded hover:border-gray-400 hover:text-gray-700"
            >
              + Set up recurring
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comment input
// ---------------------------------------------------------------------------

function CommentInput({ onSubmit }: { onSubmit: (content: string) => void }) {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content.trim());
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={!content.trim()}
        className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
