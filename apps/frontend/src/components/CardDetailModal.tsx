import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { useAttachments } from '@/hooks/useAttachments';
import { attachmentsApi } from '@/api/attachments';

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
  column: { id: string; title: string };
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

export default function CardDetailModal({
  cardId,
  onClose,
}: {
  cardId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const backdropRef = useRef<HTMLDivElement>(null);

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

  const toggleItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiClient.patch(`/checklist-items/${itemId}/toggle`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
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
            {/* Labels */}
            {card.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {card.labels.map((cl) => (
                  <span
                    key={cl.label.id}
                    className="text-xs px-2 py-0.5 rounded text-white font-medium"
                    style={{ backgroundColor: cl.label.color }}
                  >
                    {cl.label.name}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <EditableDescription
              value={card.description}
              onSave={(description) => updateMutation.mutate({ description })}
            />

            {/* Checklists */}
            {card.checklists.map((cl) => (
              <div key={cl.id}>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{cl.title}</h4>
                {cl.items.length > 0 && (
                  <div className="mb-1">
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
                  <div key={comment.id} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                      {comment.author.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {comment.author.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5">{comment.content}</p>
                    </div>
                  </div>
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
                  <option key={p} value={p}>{p}</option>
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

            {/* Dates */}
            {(card.startDate || card.dueDate) && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Dates</h4>
                {card.startDate && (
                  <p className="text-xs text-gray-600">
                    Start: {new Date(card.startDate).toLocaleDateString('ko-KR')}
                  </p>
                )}
                {card.dueDate && (
                  <p className="text-xs text-gray-600">
                    Due: {new Date(card.dueDate).toLocaleDateString('ko-KR')}
                  </p>
                )}
              </div>
            )}

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
