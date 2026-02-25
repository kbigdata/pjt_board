import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableProvidedDragHandleProps,
} from '@hello-pangea/dnd';
import { boardsApi, type Card, type Column } from '@/api/boards';
import { templatesApi, type BoardTemplate } from '@/api/templates';
import { savedFiltersApi, type SavedFilter } from '@/api/saved-filters';
import { useSwimlanes } from '@/hooks/useSwimlanes';
import { type Swimlane } from '@/api/swimlanes';
import { useUIStore } from '@/stores/ui';
import ActivityFeed from '@/components/ActivityFeed';
import ArchiveDrawer from '@/components/ArchiveDrawer';
import ListView from '@/components/ListView';
import CalendarView from '@/components/CalendarView';
import TimelineView from '@/components/TimelineView';
import KeyboardShortcutHelp from '@/components/KeyboardShortcutHelp';
import { useBoardSocket } from '@/hooks/useSocket';
import { useColumnCollapseStore } from '@/stores/columnCollapse';
import { usePresenceStore } from '@/stores/presence';
import { useAuthStore } from '@/stores/auth';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-400',
  MEDIUM: 'bg-blue-400',
  LOW: 'bg-gray-400',
};

const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const COLUMN_PRESET_COLORS = [
  { label: 'Red', value: '#ef4444' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Gray', value: '#6b7280' },
];

function getDueDateStatus(
  dueDate: string | null,
  columnType?: string,
): { label: string; className: string } | null {
  if (!dueDate) return null;

  // Card in a DONE column: always green
  if (columnType === 'DONE') {
    const due = new Date(dueDate);
    return {
      label: due.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      className: 'bg-[var(--success-light)] text-[var(--success)]',
    };
  }

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) return { label: 'Overdue', className: 'bg-[var(--error-light)] text-[var(--error)]' };
  if (diffHours <= 24) return { label: 'Due soon', className: 'bg-[var(--warning-light)] text-[var(--warning)]' };
  if (diffDays === 0) return { label: 'Due today', className: 'bg-[var(--warning-light)] text-[var(--warning)]' };
  if (diffDays <= 3) return { label: `D-${diffDays}`, className: 'bg-[var(--warning-light)] text-[var(--warning)]' };
  return {
    label: due.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    className: 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]',
  };
}

// AG-001: Card aging helpers
function getCardAgingDays(card: Card): number {
  const ref = card.updatedAt ?? card.createdAt;
  if (!ref) return 0;
  return Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
}

function getCardAgingStyle(days: number): { className: string; showClock: boolean } {
  if (days >= 14) {
    return { className: 'bg-[var(--error-light)]/30 opacity-70', showClock: true };
  }
  if (days >= 7) {
    return { className: 'bg-[var(--warning-light)]/30 opacity-80', showClock: true };
  }
  if (days >= 3) {
    return { className: 'bg-[var(--warning-light)]/20 opacity-90', showClock: false };
  }
  return { className: '', showClock: false };
}

function formatAgingLabel(days: number): string | null {
  if (days < 1) return null;
  if (days < 7) return `Updated ${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `Updated ${weeks}w ago`;
}

// SF-002, SF-005~010: Advanced filter state shape
interface FilterState {
  searchQuery: string;
  priorities: Set<string>;
  labelIds: Set<string>;
  assigneeIds: Set<string>;
  dueDateStart: string;
  dueDateEnd: string;
  hasDueDate: boolean;
}

function getEmptyFilters(): FilterState {
  return {
    searchQuery: '',
    priorities: new Set(),
    labelIds: new Set(),
    assigneeIds: new Set(),
    dueDateStart: '',
    dueDateEnd: '',
    hasDueDate: false,
  };
}

function countActiveFilters(f: FilterState): number {
  let count = 0;
  if (f.searchQuery) count++;
  if (f.priorities.size > 0) count++;
  if (f.labelIds.size > 0) count++;
  if (f.assigneeIds.size > 0) count++;
  if (f.dueDateStart || f.dueDateEnd) count++;
  if (f.hasDueDate) count++;
  return count;
}

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const queryClient = useQueryClient();
  const { openCard, activeCardId } = useUIStore();
  const currentUser = useAuthStore((s) => s.user);
  const { t } = useTranslation('board');
  const { t: tc } = useTranslation('common');

  // Multi-card select state
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  // Real-time sync
  const { socket } = useBoardSocket(boardId);

  // Presence store
  const { onlineUsers, cardEditors } = usePresenceStore();
  const boardOnlineUserIds = boardId ? (onlineUsers[boardId] ?? []) : [];

  const [activityOpen, setActivityOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const { toggleColumn, isCollapsed } = useColumnCollapseStore();

  // SF-002: Advanced filter panel toggle
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<FilterState>(getEmptyFilters());

  // VW-002: View mode (board / list / calendar / timeline)
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'calendar' | 'timeline'>('board');

  // Swimlane state
  const [swimlaneMode, setSwimlaneMode] = useState(false);
  const { swimlanes, createSwimlane } = useSwimlanes(boardId);
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<Set<string>>(new Set());

  // CL-003: Delete column state
  const [deleteColumnState, setDeleteColumnState] = useState<{
    columnId: string;
    columnTitle: string;
    hasCards: boolean;
  } | null>(null);

  // TM: Save as Template state
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');

  // Search input ref for keyboard shortcut 'f'
  const searchInputRef = useRef<HTMLInputElement>(null);

  // First column ref for keyboard shortcut 'n'
  const firstColumnAddCardRef = useRef<(() => void) | null>(null);

  // Keyboard shortcuts
  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    onNewCard: () => firstColumnAddCardRef.current?.(),
    onFocusSearch: () => searchInputRef.current?.focus(),
    onCloseModal: () => {
      if (selectedCardIds.size > 0) setSelectedCardIds(new Set());
      else if (activityOpen) setActivityOpen(false);
      else if (archiveOpen) setArchiveOpen(false);
      else if (showFilterPanel) setShowFilterPanel(false);
    },
  });

  // DD-012: Auto-scroll refs
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardsApi.getById(boardId!),
    enabled: !!boardId,
  });

  // Save board to recent boards in localStorage
  useEffect(() => {
    if (boardId && board) {
      const recent: Array<{ id: string; title: string }> = JSON.parse(
        localStorage.getItem('kanflow:recent-boards') || '[]',
      );
      const filtered = recent.filter((b) => b.id !== boardId);
      filtered.unshift({ id: boardId, title: board.title });
      localStorage.setItem('kanflow:recent-boards', JSON.stringify(filtered.slice(0, 5)));
    }
  }, [boardId, board?.title]);

  const { data: cards } = useQuery({
    queryKey: ['cards', boardId],
    queryFn: () => boardsApi.getCards(boardId!),
    enabled: !!boardId,
  });

  const { data: columns } = useQuery({
    queryKey: ['columns', boardId],
    queryFn: () => boardsApi.getColumns(boardId!),
    enabled: !!boardId,
  });

  // Extract unique labels and assignees for filter dropdowns
  const { allLabels, allAssignees } = useMemo(() => {
    const labelMap = new Map<string, { id: string; name: string; color: string }>();
    const assigneeMap = new Map<string, { id: string; name: string }>();
    (cards ?? []).forEach((card) => {
      card.labels?.forEach((cl) => labelMap.set(cl.label.id, cl.label));
      card.assignees?.forEach((a) => assigneeMap.set(a.user.id, a.user));
    });
    return {
      allLabels: Array.from(labelMap.values()),
      allAssignees: Array.from(assigneeMap.values()),
    };
  }, [cards]);

  // SF-002~010: Apply advanced filters
  const filteredCards = useMemo(() => {
    if (!cards) return [];
    return cards.filter((card) => {
      const { searchQuery, priorities, labelIds, assigneeIds, dueDateStart, dueDateEnd, hasDueDate } = filters;

      if (searchQuery && !card.title.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
      if (priorities.size > 0 && !priorities.has(card.priority)) return false;
      if (labelIds.size > 0 && !card.labels?.some((cl) => labelIds.has(cl.label.id)))
        return false;
      if (assigneeIds.size > 0 && !card.assignees?.some((a) => assigneeIds.has(a.user.id)))
        return false;
      if (hasDueDate && !card.dueDate) return false;
      if (dueDateStart && card.dueDate && new Date(card.dueDate) < new Date(dueDateStart))
        return false;
      if (dueDateEnd && card.dueDate && new Date(card.dueDate) > new Date(dueDateEnd))
        return false;

      return true;
    });
  }, [cards, filters]);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const hasActiveFilters = activeFilterCount > 0;

  // DD-009: Optimistic update for card move
  const moveCardMutation = useMutation({
    mutationFn: ({
      cardId,
      data,
    }: {
      cardId: string;
      data: { columnId: string; position: number; swimlaneId?: string | null };
    }) => boardsApi.moveCard(cardId, data),
    onMutate: async ({ cardId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['cards', boardId] });
      const previousCards = queryClient.getQueryData<Card[]>(['cards', boardId]);

      queryClient.setQueryData<Card[]>(['cards', boardId], (old) => {
        if (!old) return old;
        return old.map((card) =>
          card.id === cardId
            ? {
                ...card,
                columnId: data.columnId,
                position: data.position,
                ...(data.swimlaneId !== undefined && { swimlaneId: data.swimlaneId ?? null }),
              }
            : card,
        );
      });

      return { previousCards };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(['cards', boardId], context.previousCards);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
    },
  });

  // DD-009: Optimistic update for column move
  const moveColumnMutation = useMutation({
    mutationFn: ({ columnId, data }: { columnId: string; data: { position: number } }) =>
      boardsApi.moveColumn(columnId, data),
    onMutate: async ({ columnId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['columns', boardId] });
      const previousColumns = queryClient.getQueryData<Column[]>(['columns', boardId]);

      queryClient.setQueryData<Column[]>(['columns', boardId], (old) => {
        if (!old) return old;
        return old.map((col) =>
          col.id === columnId ? { ...col, position: data.position } : col,
        );
      });

      return { previousColumns };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousColumns) {
        queryClient.setQueryData(['columns', boardId], context.previousColumns);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] });
    },
  });

  const createCardMutation = useMutation({
    mutationFn: (data: { title: string; columnId: string }) =>
      boardsApi.createCard(boardId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
    },
  });

  const createColumnMutation = useMutation({
    mutationFn: (data: { title: string }) => boardsApi.createColumn(boardId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] });
    },
  });

  // CL-003: Delete column mutation
  const deleteColumnMutation = useMutation({
    mutationFn: ({ columnId, targetColumnId }: { columnId: string; targetColumnId?: string }) =>
      boardsApi.deleteColumn(columnId, targetColumnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] });
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
      setDeleteColumnState(null);
    },
  });

  // CL-006, CL-009, CL-010: Update column mutation
  const updateColumnMutation = useMutation({
    mutationFn: ({
      columnId,
      data,
    }: {
      columnId: string;
      data: { title?: string; color?: string | null; wipLimit?: number | null; description?: string | null };
    }) => boardsApi.updateColumn(columnId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] });
    },
  });

  // TM: Save board as template
  const saveTemplateMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      templatesApi.createFromBoard(boardId!, data),
    onSuccess: () => {
      setShowSaveTemplate(false);
      setTemplateName('');
      setTemplateDesc('');
    },
  });

  // SF-SAVED: Saved filters
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [showSaveFilterInput, setShowSaveFilterInput] = useState(false);

  const { data: savedFilters = [] } = useQuery<SavedFilter[]>({
    queryKey: ['saved-filters', boardId],
    queryFn: () => savedFiltersApi.list(boardId!),
    enabled: !!boardId,
  });

  const createSavedFilterMutation = useMutation({
    mutationFn: (data: { name: string; filters: object }) =>
      savedFiltersApi.create(boardId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters', boardId] });
      setSaveFilterName('');
      setShowSaveFilterInput(false);
    },
  });

  const deleteSavedFilterMutation = useMutation({
    mutationFn: (id: string) => savedFiltersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters', boardId] });
    },
  });

  const handleApplySavedFilter = (sf: SavedFilter) => {
    setFilters({
      searchQuery: sf.filters.keyword ?? '',
      priorities: new Set(sf.filters.priority ?? []),
      labelIds: new Set(sf.filters.labelIds ?? []),
      assigneeIds: new Set(sf.filters.assigneeIds ?? []),
      dueDateStart: sf.filters.dueDateFrom ?? '',
      dueDateEnd: sf.filters.dueDateTo ?? '',
      hasDueDate: false,
    });
    setShowSavedFilters(false);
  };

  const handleSaveCurrentFilter = () => {
    if (!saveFilterName.trim()) return;
    createSavedFilterMutation.mutate({
      name: saveFilterName.trim(),
      filters: {
        keyword: filters.searchQuery || undefined,
        priority: filters.priorities.size > 0 ? Array.from(filters.priorities) : undefined,
        labelIds: filters.labelIds.size > 0 ? Array.from(filters.labelIds) : undefined,
        assigneeIds: filters.assigneeIds.size > 0 ? Array.from(filters.assigneeIds) : undefined,
        dueDateFrom: filters.dueDateStart || undefined,
        dueDateTo: filters.dueDateEnd || undefined,
      },
    });
  };

  // IO-001: Export board
  const handleExportBoard = async () => {
    if (!boardId || !board) return;
    try {
      const data = await boardsApi.exportBoard(boardId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${board.title.replace(/\s+/g, '-').toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Export failed silently — backend may not support this endpoint yet
    }
  };

  // DD-012: Auto-scroll handler
  const handleAutoScroll = useCallback((x: number) => {
    const container = boardScrollRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scrollZone = 80;
    const scrollSpeed = 15;

    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }

    const scroll = () => {
      if (!container) return;
      if (x < rect.left + scrollZone) {
        container.scrollLeft -= scrollSpeed;
        autoScrollRef.current = requestAnimationFrame(scroll);
      } else if (x > rect.right - scrollZone) {
        container.scrollLeft += scrollSpeed;
        autoScrollRef.current = requestAnimationFrame(scroll);
      }
    };

    if (x < rect.left + scrollZone || x > rect.right - scrollZone) {
      scroll();
    }
  }, []);

  // DD-012: Drag start — attach mousemove listener for auto-scroll
  const handleDragStart = useCallback(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleAutoScroll(e.clientX);
    };
    document.addEventListener('mousemove', handleMouseMove);
    (boardScrollRef as React.MutableRefObject<HTMLDivElement & { _cleanup?: () => void }>)
      .current &&
      ((
        boardScrollRef as React.MutableRefObject<HTMLDivElement & { _cleanup?: () => void }>
      ).current._cleanup = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        if (autoScrollRef.current) {
          cancelAnimationFrame(autoScrollRef.current);
          autoScrollRef.current = null;
        }
      });
  }, [handleAutoScroll]);

  const handleDragEnd = (result: DropResult) => {
    // DD-012: cleanup auto-scroll
    const scrollEl = boardScrollRef.current as
      | (HTMLDivElement & { _cleanup?: () => void })
      | null;
    scrollEl?._cleanup?.();

    if (!result.destination) return;
    const { type, draggableId, destination } = result;

    if (type === 'COLUMN') {
      if (!columns) return;
      const sorted = [...columns].sort((a, b) => a.position - b.position);
      const filtered = sorted.filter((c) => c.id !== draggableId);
      const destIndex = destination.index;

      let newPosition: number;
      if (filtered.length === 0) {
        newPosition = 1024;
      } else if (destIndex === 0) {
        newPosition = filtered[0].position / 2;
      } else if (destIndex >= filtered.length) {
        newPosition = filtered[filtered.length - 1].position + 1024;
      } else {
        newPosition = (filtered[destIndex - 1].position + filtered[destIndex].position) / 2;
      }

      moveColumnMutation.mutate({
        columnId: draggableId,
        data: { position: newPosition },
      });
      return;
    }

    // Card drag
    if (!cards || !columns) return;

    // Parse droppable ID — could be just columnId or swimlaneId:columnId
    let destColumnId: string;
    let destSwimlaneId: string | null | undefined;

    if (destination.droppableId.includes(':')) {
      const parts = destination.droppableId.split(':');
      destSwimlaneId = parts[0] === '__default__' ? null : parts[0];
      destColumnId = parts[1];
    } else {
      destColumnId = destination.droppableId;
      destSwimlaneId = undefined;
    }

    const destCards = filteredCards
      .filter((c) => {
        if (swimlaneMode && destSwimlaneId !== undefined) {
          return (
            c.columnId === destColumnId &&
            c.swimlaneId === destSwimlaneId &&
            c.id !== draggableId
          );
        }
        return c.columnId === destColumnId && c.id !== draggableId;
      })
      .sort((a, b) => a.position - b.position);

    let newPosition: number;
    const destIndex = destination.index;

    if (destCards.length === 0) {
      newPosition = 1024;
    } else if (destIndex === 0) {
      newPosition = destCards[0].position / 2;
    } else if (destIndex >= destCards.length) {
      newPosition = destCards[destCards.length - 1].position + 1024;
    } else {
      newPosition = (destCards[destIndex - 1].position + destCards[destIndex].position) / 2;
    }

    // WP-001: WIP limit check before moving card
    if (columns) {
      const destColumn = columns.find((c) => c.id === destColumnId);
      if (destColumn?.wipLimit) {
        const currentCardCount = (cards ?? []).filter(
          (c) => c.columnId === destColumnId && c.id !== draggableId,
        ).length;
        if (currentCardCount >= destColumn.wipLimit) {
          const confirmed = window.confirm(
            `Column "${destColumn.title}" has reached its WIP limit of ${destColumn.wipLimit}. Do you want to move the card anyway?`,
          );
          if (!confirmed) return;
        }
      }
    }

    // MS-001: Multi-card select drag
    if (selectedCardIds.has(draggableId) && selectedCardIds.size > 1) {
      // Move all selected cards sequentially with incremented positions
      const selectedArr = Array.from(selectedCardIds);
      selectedArr.forEach((cid, offset) => {
        const pos = newPosition + offset * 0.01;
        moveCardMutation.mutate({
          cardId: cid,
          data: {
            columnId: destColumnId,
            position: pos,
            ...(swimlaneMode && destSwimlaneId !== undefined && { swimlaneId: destSwimlaneId }),
          },
        });
      });
      setSelectedCardIds(new Set());
      return;
    }

    moveCardMutation.mutate({
      cardId: draggableId,
      data: {
        columnId: destColumnId,
        position: newPosition,
        ...(swimlaneMode && destSwimlaneId !== undefined && { swimlaneId: destSwimlaneId }),
      },
    });
  };

  if (boardLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="text-[var(--text-secondary)]">{tc('loading')}</div>
      </div>
    );
  }

  const sortedColumns = [...(columns ?? board?.columns ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Board header */}
      <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-primary)] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link
            to={`/workspaces/${board?.workspaceId}`}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            &larr; {tc('back')}
          </Link>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{board?.title}</h2>
          {/* PR-001: Online presence avatars */}
          {boardOnlineUserIds.length > 0 && (
            <div className="flex items-center gap-1">
              {boardOnlineUserIds.slice(0, 5).map((uid) => {
                const memberInfo = board?.members?.find((m) => m.userId === uid)?.user;
                const initials = memberInfo?.name?.charAt(0).toUpperCase() ?? '?';
                return (
                  <div
                    key={uid}
                    className="relative"
                    title={memberInfo?.name ?? uid}
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-[var(--bg-primary)]">
                      {initials}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full ring-1 ring-[var(--bg-primary)]" />
                  </div>
                );
              })}
              {boardOnlineUserIds.length > 5 && (
                <span className="text-xs text-[var(--text-tertiary)] ml-1">+{boardOnlineUserIds.length - 5}</span>
              )}
            </div>
          )}
          {/* MS-001: Selected cards count badge */}
          {selectedCardIds.size > 0 && (
            <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5">
              {selectedCardIds.size} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* VW-002: View toggle */}
          <div className="flex items-center rounded border border-[var(--border-secondary)] overflow-hidden">
            <button
              onClick={() => setViewMode('board')}
              className={`text-sm px-3 py-1 ${viewMode === 'board' ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            >
              {t('views.kanban')}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`text-sm px-3 py-1 border-l border-[var(--border-secondary)] ${viewMode === 'list' ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            >
              {t('views.list')}
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`text-sm px-3 py-1 border-l border-[var(--border-secondary)] ${viewMode === 'calendar' ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            >
              {t('views.calendar')}
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`text-sm px-3 py-1 border-l border-[var(--border-secondary)] ${viewMode === 'timeline' ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            >
              {t('views.timeline')}
            </button>
          </div>

          <button
            onClick={() => setSwimlaneMode((v) => !v)}
            className={`text-sm px-3 py-1 rounded ${swimlaneMode ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
          >
            {t('swimlanes')}
          </button>
          <button
            onClick={() => setArchiveOpen((v) => !v)}
            className={`text-sm px-3 py-1 rounded ${archiveOpen ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
          >
            {t('archive')}
          </button>
          <button
            onClick={() => setActivityOpen((v) => !v)}
            className={`text-sm px-3 py-1 rounded ${activityOpen ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
          >
            {t('activity')}
          </button>

          {/* IO-001: Export */}
          <button
            onClick={handleExportBoard}
            className="text-sm px-3 py-1 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            title="Export board as JSON"
          >
            {t('export')}
          </button>

          {/* TM: Save as template */}
          <button
            onClick={() => setShowSaveTemplate((v) => !v)}
            className={`text-sm px-3 py-1 rounded ${showSaveTemplate ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
          >
            {t('saveAsTemplate')}
          </button>

          {/* Links to Automations and Reports */}
          <Link
            to={`/boards/${boardId}/automations`}
            className="text-sm px-3 py-1 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            {t('automations')}
          </Link>
          <Link
            to={`/boards/${boardId}/reports`}
            className="text-sm px-3 py-1 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            {t('reports')}
          </Link>

          {/* KB: Help shortcut hint */}
          <button
            onClick={() => setShowHelp(true)}
            className="text-sm px-2 py-1 rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
        </div>
      </div>

      {/* TM: Save as Template form */}
      {showSaveTemplate && (
        <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveTemplateMutation.mutate({
                name: templateName,
                description: templateDesc || undefined,
              });
            }}
            className="flex items-center gap-2 flex-wrap"
          >
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={t('templateNamePlaceholder')}
              className="px-3 py-1.5 border border-[var(--border-secondary)] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 bg-[var(--bg-primary)] text-[var(--text-primary)]"
              required
              autoFocus
            />
            <input
              type="text"
              value={templateDesc}
              onChange={(e) => setTemplateDesc(e.target.value)}
              placeholder={t('templateDescPlaceholder')}
              className="px-3 py-1.5 border border-[var(--border-secondary)] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-56 bg-[var(--bg-primary)] text-[var(--text-primary)]"
            />
            <button
              type="submit"
              disabled={saveTemplateMutation.isPending}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saveTemplateMutation.isPending ? tc('loading') : t('saveAsTemplate')}
            </button>
            <button
              type="button"
              onClick={() => setShowSaveTemplate(false)}
              className="px-3 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm"
            >
              {tc('cancel')}
            </button>
          </form>
        </div>
      )}

      {/* SF-002: Filter bar */}
      <div className="px-4 py-2 border-b border-[var(--border-primary)] bg-[var(--bg-primary)] flex items-center gap-3 flex-wrap">
        <input
          ref={searchInputRef}
          type="text"
          value={filters.searchQuery}
          onChange={(e) => setFilters((f) => ({ ...f, searchQuery: e.target.value }))}
          placeholder={tc('search')}
          className="px-3 py-1.5 border border-[var(--border-secondary)] rounded-md text-sm w-48 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
        />

        {/* SF-002: Advanced filters toggle button */}
        <button
          onClick={() => setShowFilterPanel((v) => !v)}
          className={`relative text-sm px-3 py-1.5 rounded border transition-colors ${
            showFilterPanel || activeFilterCount > 0
              ? 'bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)]'
              : 'border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            {tc('filter')}
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {activeFilterCount}
              </span>
            )}
          </span>
        </button>

        {hasActiveFilters && (
          <button
            onClick={() => setFilters(getEmptyFilters())}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1"
          >
            {tc('clear')}
          </button>
        )}

        {/* SF-SAVED: Saved filters controls */}
        <div className="relative">
          <button
            onClick={() => setShowSavedFilters((v) => !v)}
            className={`text-sm px-3 py-1.5 rounded border transition-colors ${
              showSavedFilters
                ? 'bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)]'
                : 'border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {t('savedFilters')} {savedFilters.length > 0 && `(${savedFilters.length})`}
          </button>
          {showSavedFilters && (
            <div className="dropdown-menu absolute top-full left-0 mt-1 z-20 w-56">
              {savedFilters.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] px-3 py-2 text-center">{t('noSavedFilters')}</p>
              ) : (
                <div className="py-1 max-h-48 overflow-y-auto">
                  {savedFilters.map((sf) => (
                    <div
                      key={sf.id}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-[var(--bg-hover)] group"
                    >
                      <button
                        onClick={() => handleApplySavedFilter(sf)}
                        className="flex-1 text-left text-sm text-[var(--text-primary)] truncate"
                      >
                        {sf.name}
                      </button>
                      <button
                        onClick={() => deleteSavedFilterMutation.mutate(sf.id)}
                        className="text-[var(--text-tertiary)] hover:text-[var(--error)] ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        title="Delete saved filter"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-[var(--border-primary)] p-2">
                {showSaveFilterInput ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={saveFilterName}
                      onChange={(e) => setSaveFilterName(e.target.value)}
                      placeholder={t('filterNamePlaceholder')}
                      className="flex-1 px-2 py-1 border border-[var(--border-secondary)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCurrentFilter();
                        if (e.key === 'Escape') setShowSaveFilterInput(false);
                      }}
                    />
                    <button
                      onClick={handleSaveCurrentFilter}
                      disabled={createSavedFilterMutation.isPending || !saveFilterName.trim()}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                    >
                      {tc('save')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSaveFilterInput(true)}
                    className="w-full text-xs text-center py-1 text-[var(--accent)] hover:text-[var(--accent-hover)]"
                  >
                    + {t('saveCurrentFilter')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SF-002: Advanced filter panel */}
      {showFilterPanel && (
        <AdvancedFilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          allLabels={allLabels}
          allAssignees={allAssignees}
        />
      )}

      {/* Board content */}
      <div
        ref={boardScrollRef}
        className="flex-1 overflow-auto p-4"
        onClick={(e) => {
          // MS-001: Clear selection when clicking on the board background
          if (e.target === boardScrollRef.current && selectedCardIds.size > 0) {
            setSelectedCardIds(new Set());
          }
        }}
      >
        {/* VW-002: Calendar view */}
        {viewMode === 'calendar' && cards && (
          <CalendarView
            cards={filteredCards}
            onCardClick={(id) => openCard(id)}
          />
        )}
        {/* VW-002: Timeline view */}
        {viewMode === 'timeline' && cards && (
          <TimelineView
            cards={filteredCards}
            onCardClick={(id) => openCard(id)}
          />
        )}
        {/* VW-002: List view */}
        {viewMode === 'list' ? (
          <ListView
            cards={filteredCards}
            columns={sortedColumns}
            onCardClick={(cardId) => openCard(cardId)}
          />
        ) : viewMode === 'board' ? (
        <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
          {swimlaneMode ? (
            <SwimlaneBoard
              columns={sortedColumns}
              swimlanes={swimlanes}
              cards={filteredCards}
              allCards={cards ?? []}
              onCardClick={(cardId) => openCard(cardId)}
              collapsedSwimlanes={collapsedSwimlanes}
              onToggleSwimlane={(id) => {
                setCollapsedSwimlanes((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
              onAddSwimlane={(title) => createSwimlane({ title })}
            />
          ) : (
            <Droppable droppableId="board-columns" direction="horizontal" type="COLUMN">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex gap-4 h-full"
                >
                  {sortedColumns.map((column, index) => {
                    const collapsed = isCollapsed(column.id);
                    const columnCards = filteredCards
                      .filter((c) => c.columnId === column.id)
                      .sort((a, b) => a.position - b.position);
                    const totalCount = (cards ?? []).filter(
                      (c) => c.columnId === column.id,
                    ).length;

                    return (
                      <Draggable key={column.id} draggableId={column.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex-shrink-0 ${collapsed ? 'w-10' : 'w-72'} ${snapshot.isDragging ? 'opacity-80' : ''}`}
                          >
                            {collapsed ? (
                              <CollapsedColumn
                                column={column}
                                cardCount={totalCount}
                                onExpand={() => toggleColumn(column.id)}
                                dragHandleProps={provided.dragHandleProps}
                              />
                            ) : (
                              <KanbanColumn
                                column={column}
                                cards={columnCards}
                                onAddCard={(title) =>
                                  createCardMutation.mutate({ title, columnId: column.id })
                                }
                                onCardClick={(cardId) => openCard(cardId)}
                                dragHandleProps={provided.dragHandleProps}
                                dimFiltered={!!hasActiveFilters}
                                totalCards={totalCount}
                                onCollapse={() => toggleColumn(column.id)}
                                onDelete={() => {
                                  const colCards = (cards ?? []).filter(
                                    (c) => c.columnId === column.id,
                                  );
                                  setDeleteColumnState({
                                    columnId: column.id,
                                    columnTitle: column.title,
                                    hasCards: colCards.length > 0,
                                  });
                                }}
                                onUpdateColumn={(data) =>
                                  updateColumnMutation.mutate({ columnId: column.id, data })
                                }
                                onRegisterAddCard={
                                  index === 0
                                    ? (fn) => { firstColumnAddCardRef.current = fn; }
                                    : undefined
                                }
                                selectedCardIds={selectedCardIds}
                                onToggleSelectCard={(cardId) => {
                                  setSelectedCardIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(cardId)) next.delete(cardId);
                                    else next.add(cardId);
                                    return next;
                                  });
                                }}
                                cardEditors={cardEditors}
                                boardMembers={board?.members ?? []}
                                currentUserId={currentUser?.id}
                                activeCardId={activeCardId}
                              />
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  <AddColumnButton onAdd={(title) => createColumnMutation.mutate({ title })} />
                </div>
              )}
            </Droppable>
          )}
        </DragDropContext>
        ) : null}
      </div>

      {showHelp && <KeyboardShortcutHelp onClose={() => setShowHelp(false)} />}

      {boardId && (
        <ActivityFeed
          boardId={boardId}
          isOpen={activityOpen}
          onClose={() => setActivityOpen(false)}
        />
      )}

      {boardId && (
        <ArchiveDrawer
          boardId={boardId}
          isOpen={archiveOpen}
          onClose={() => setArchiveOpen(false)}
        />
      )}

      {/* CL-003: Delete column modal */}
      {deleteColumnState && (
        <DeleteColumnModal
          columnId={deleteColumnState.columnId}
          columnTitle={deleteColumnState.columnTitle}
          hasCards={deleteColumnState.hasCards}
          columns={sortedColumns}
          onConfirm={(targetColumnId) =>
            deleteColumnMutation.mutate({
              columnId: deleteColumnState.columnId,
              targetColumnId,
            })
          }
          onCancel={() => setDeleteColumnState(null)}
          isPending={deleteColumnMutation.isPending}
        />
      )}
    </div>
  );
}

// SF-002: Advanced filter panel component
function AdvancedFilterPanel({
  filters,
  onFiltersChange,
  allLabels,
  allAssignees,
}: {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  allLabels: Array<{ id: string; name: string; color: string }>;
  allAssignees: Array<{ id: string; name: string }>;
}) {
  const { t } = useTranslation('board');
  const toggleSet = <T,>(set: Set<T>, item: T): Set<T> => {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  };

  return (
    <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-wrap gap-6">
      {/* Priority multi-select */}
      <div>
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">{t('filterPriority')}</p>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() =>
                onFiltersChange({ ...filters, priorities: toggleSet(filters.priorities, p) })
              }
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                filters.priorities.has(p)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-[var(--text-secondary)] border-[var(--border-secondary)] hover:border-[var(--border-primary)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Assignee multi-select */}
      {allAssignees.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">{t('filterAssignee')}</p>
          <div className="flex flex-wrap gap-1.5">
            {allAssignees.map((a) => (
              <button
                key={a.id}
                onClick={() =>
                  onFiltersChange({ ...filters, assigneeIds: toggleSet(filters.assigneeIds, a.id) })
                }
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filters.assigneeIds.has(a.id)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-[var(--text-secondary)] border-[var(--border-secondary)] hover:border-[var(--border-primary)]'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Label multi-select */}
      {allLabels.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">{t('filterLabel')}</p>
          <div className="flex flex-wrap gap-1.5">
            {allLabels.map((l) => (
              <button
                key={l.id}
                onClick={() =>
                  onFiltersChange({ ...filters, labelIds: toggleSet(filters.labelIds, l.id) })
                }
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filters.labelIds.has(l.id)
                    ? 'text-white border-transparent'
                    : 'text-[var(--text-secondary)] border-[var(--border-secondary)] hover:border-[var(--border-primary)]'
                }`}
                style={
                  filters.labelIds.has(l.id)
                    ? { backgroundColor: l.color, borderColor: l.color }
                    : {}
                }
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Due date range */}
      <div>
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">{t('filterDueDate')}</p>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.dueDateStart}
            onChange={(e) => onFiltersChange({ ...filters, dueDateStart: e.target.value })}
            className="text-xs px-2 py-1 border border-[var(--border-secondary)] rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
          />
          <span className="text-xs text-[var(--text-tertiary)]">{t('filterDateTo')}</span>
          <input
            type="date"
            value={filters.dueDateEnd}
            onChange={(e) => onFiltersChange({ ...filters, dueDateEnd: e.target.value })}
            className="text-xs px-2 py-1 border border-[var(--border-secondary)] rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
          />
        </div>
        <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.hasDueDate}
            onChange={(e) => onFiltersChange({ ...filters, hasDueDate: e.target.checked })}
            className="rounded border-[var(--border-secondary)]"
          />
          <span className="text-xs text-[var(--text-secondary)]">{t('filterHasDueDate')}</span>
        </label>
      </div>
    </div>
  );
}

// Swimlane board layout
function SwimlaneBoard({
  columns,
  swimlanes,
  cards,
  allCards,
  onCardClick,
  collapsedSwimlanes,
  onToggleSwimlane,
  onAddSwimlane,
}: {
  columns: Column[];
  swimlanes: Swimlane[];
  cards: Card[];
  allCards: Card[];
  onCardClick: (cardId: string) => void;
  collapsedSwimlanes: Set<string>;
  onToggleSwimlane: (id: string) => void;
  onAddSwimlane: (title: string) => void;
}) {
  const { t } = useTranslation('board');
  const { t: tc } = useTranslation('common');
  const [addingLane, setAddingLane] = useState(false);
  const [newLaneTitle, setNewLaneTitle] = useState('');

  // If no swimlanes exist, render a single default lane
  const effectiveLanes: Swimlane[] =
    swimlanes.length > 0
      ? swimlanes
      : [
          {
            id: '__default__',
            title: 'Default',
            position: 0,
            color: null,
            isDefault: true,
            boardId: '',
            archivedAt: null,
          },
        ];

  // Cards with null swimlaneId go to the default lane
  const getSwimlaneCards = (laneId: string) =>
    cards.filter((c) =>
      laneId === '__default__'
        ? !c.swimlaneId || !swimlanes.some((s) => s.id === c.swimlaneId)
        : c.swimlaneId === laneId,
    );

  // Suppress unused variable warning — allCards is available for future use (e.g., total counts)
  void allCards;

  return (
    <div className="overflow-auto">
      {/* Column header row */}
      <div className="flex sticky top-0 z-10 bg-[var(--bg-primary)] border-b border-[var(--border-primary)]">
        <div className="w-40 flex-shrink-0 px-3 py-2 font-medium text-sm text-[var(--text-secondary)] border-r border-[var(--border-primary)]">
          {t('swimlanes')}
        </div>
        {columns.map((col) => (
          <div
            key={col.id}
            className="w-60 flex-shrink-0 px-3 py-2 font-medium text-sm text-[var(--text-primary)] border-r border-[var(--border-primary)]"
          >
            <div className="flex items-center gap-2">
              {col.color && (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
              )}
              {col.title}
            </div>
          </div>
        ))}
      </div>

      {/* Swimlane rows */}
      {effectiveLanes.map((lane) => {
        const laneCards = getSwimlaneCards(lane.id);
        const isCollapsed = collapsedSwimlanes.has(lane.id);

        return (
          <div key={lane.id} className="border-b border-[var(--border-primary)]">
            <div className="flex">
              {/* Swimlane row header */}
              <div className="w-40 flex-shrink-0 px-3 py-2 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] flex items-center gap-2">
                <button
                  onClick={() => onToggleSwimlane(lane.id)}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-xs"
                >
                  {isCollapsed ? '\u25B6' : '\u25BC'}
                </button>
                <span className="text-sm font-medium text-[var(--text-primary)] truncate">{lane.title}</span>
                <span className="text-xs text-[var(--text-tertiary)]">({laneCards.length})</span>
              </div>

              {!isCollapsed &&
                columns.map((col) => {
                  const cellCards = laneCards
                    .filter((c) => c.columnId === col.id)
                    .sort((a, b) => a.position - b.position);

                  return (
                    <Droppable
                      key={`${lane.id}:${col.id}`}
                      droppableId={`${lane.id}:${col.id}`}
                      type="CARD"
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`w-60 flex-shrink-0 border-r border-[var(--border-primary)] p-1.5 min-h-[4rem] ${
                            snapshot.isDraggingOver ? 'bg-[var(--accent-light)]' : 'bg-[var(--bg-primary)]'
                          }`}
                        >
                          {cellCards.map((card, index) => (
                            <Draggable key={card.id} draggableId={card.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => onCardClick(card.id)}
                                  className={`kanban-card p-2 mb-1.5 cursor-grab text-xs ${snapshot.isDragging ? 'kanban-card--dragging' : ''}`}
                                >
                                  <p className="font-medium text-[var(--text-primary)] leading-snug">
                                    {card.title}
                                  </p>
                                  <span className="text-[var(--text-tertiary)]">
                                    KF-{String(card.cardNumber).padStart(3, '0')}
                                  </span>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}

              {isCollapsed && (
                <div className="flex-1 bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-tertiary)] flex items-center">
                  {laneCards.length} {t('swimlaneCollapsedHint')}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Add swimlane */}
      <div className="px-3 py-2">
        {addingLane ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newLaneTitle.trim()) {
                onAddSwimlane(newLaneTitle.trim());
                setNewLaneTitle('');
                setAddingLane(false);
              }
            }}
            className="flex gap-2"
          >
            <input
              value={newLaneTitle}
              onChange={(e) => setNewLaneTitle(e.target.value)}
              placeholder={t('swimlaneTitlePlaceholder')}
              className="px-3 py-1.5 border border-[var(--border-secondary)] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              {tc('add')}
            </button>
            <button
              type="button"
              onClick={() => setAddingLane(false)}
              className="text-sm text-[var(--text-secondary)]"
            >
              {tc('cancel')}
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAddingLane(true)}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            + {t('addSwimlane')}
          </button>
        )}
      </div>
    </div>
  );
}

// CL-003: Delete column modal component
function DeleteColumnModal({
  columnId,
  columnTitle,
  hasCards,
  columns,
  onConfirm,
  onCancel,
  isPending,
}: {
  columnId: string;
  columnTitle: string;
  hasCards: boolean;
  columns: Column[];
  onConfirm: (targetColumnId?: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation('board');
  const { t: tc } = useTranslation('common');
  const [targetColumnId, setTargetColumnId] = useState('');
  const otherColumns = columns.filter((c) => c.id !== columnId);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {t('deleteColumnTitle', { title: columnTitle })}
        </h3>
        {hasCards ? (
          <>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {t('deleteColumnHasCards')}
            </p>
            <select
              value={targetColumnId}
              onChange={(e) => setTargetColumnId(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-secondary)] rounded-md text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
            >
              <option value="">{t('deleteColumnSelectTarget')}</option>
              {otherColumns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.title}
                </option>
              ))}
            </select>
          </>
        ) : (
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {t('deleteColumnNoCards')}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            {tc('cancel')}
          </button>
          <button
            onClick={() => onConfirm(hasCards ? targetColumnId || undefined : undefined)}
            disabled={isPending || (hasCards && !targetColumnId)}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? tc('loading') : tc('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

function CollapsedColumn({
  column,
  cardCount,
  onExpand,
  dragHandleProps,
}: {
  column: Column;
  cardCount: number;
  onExpand: () => void;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
}) {
  return (
    <div
      className="flex flex-col bg-[var(--bg-tertiary)] rounded-lg h-full items-center"
      style={column.color ? { borderTop: `3px solid ${column.color}` } : {}}
    >
      <div {...dragHandleProps} className="w-full px-1 py-2 flex justify-center cursor-grab">
        <button
          onClick={onExpand}
          className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-xs"
          title="Expand column"
        >
          &raquo;
        </button>
      </div>
      <Droppable droppableId={column.id} type="CARD">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 min-h-[2rem]"
          >
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <div
        className="py-2 text-xs font-medium text-[var(--text-secondary)]"
        style={{ writingMode: 'vertical-rl' }}
      >
        {column.title}
      </div>
      <div className="pb-2">
        <span className="text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-full w-5 h-5 flex items-center justify-center">
          {cardCount}
        </span>
      </div>
    </div>
  );
}

// CL-006, CL-009, CL-010: Column settings popover
function ColumnSettingsMenu({
  column,
  onUpdate,
  onDelete,
  onClose,
}: {
  column: Column;
  onUpdate: (data: { title?: string; color?: string | null; wipLimit?: number | null; description?: string | null }) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('board');
  const { t: tc } = useTranslation('common');
  const [tab, setTab] = useState<'main' | 'color'>('main');
  const [renameValue, setRenameValue] = useState(column.title);
  const [wipValue, setWipValue] = useState(column.wipLimit != null ? String(column.wipLimit) : '');
  const [descValue, setDescValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== column.title) {
      onUpdate({ title: trimmed });
    }
    onClose();
  };

  const handleWipSave = () => {
    const val = wipValue.trim();
    if (val === '') {
      onUpdate({ wipLimit: null });
    } else {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) {
        onUpdate({ wipLimit: num });
      }
    }
    onClose();
  };

  const handleDescSave = () => {
    onUpdate({ description: descValue.trim() || null });
    onClose();
  };

  const handleColorSelect = (color: string | null) => {
    onUpdate({ color });
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="dropdown-menu absolute right-0 top-full mt-1 z-30 w-56"
      onClick={(e) => e.stopPropagation()}
    >
      {tab === 'color' ? (
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setTab('main')} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-xs">
              &larr;
            </button>
            <span className="text-sm font-medium text-[var(--text-primary)]">{t('columnSetColor')}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {COLUMN_PRESET_COLORS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => handleColorSelect(value)}
                className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: value,
                  borderColor: column.color === value ? '#1d4ed8' : 'transparent',
                }}
                title={label}
              />
            ))}
            {/* Clear color */}
            <button
              onClick={() => handleColorSelect(null)}
              className="w-8 h-8 rounded-full border-2 border-[var(--border-secondary)] flex items-center justify-center text-[var(--text-tertiary)] hover:border-[var(--border-primary)] text-xs"
              title="No color"
            >
              &times;
            </button>
          </div>
        </div>
      ) : (
        <div className="py-1">
          {/* Rename */}
          <div className="px-3 py-2 border-b border-[var(--border-primary)]">
            <p className="text-xs text-[var(--text-secondary)] mb-1">{t('columnRename')}</p>
            <div className="flex gap-1">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') onClose();
                }}
                className="flex-1 px-2 py-1 border border-[var(--border-secondary)] rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
                autoFocus
              />
              <button
                onClick={handleRename}
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                {tc('save')}
              </button>
            </div>
          </div>

          {/* Color */}
          <button
            onClick={() => setTab('color')}
            className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
          >
            <span
              className="w-3 h-3 rounded-full border border-[var(--border-secondary)]"
              style={column.color ? { backgroundColor: column.color } : { backgroundColor: 'transparent' }}
            />
            {t('columnSetColor')}
          </button>

          {/* WIP limit */}
          <div className="px-3 py-2 border-t border-[var(--border-primary)]">
            <p className="text-xs text-[var(--text-secondary)] mb-1">{t('columnWipLimit')}</p>
            <div className="flex gap-1">
              <input
                type="number"
                min="1"
                value={wipValue}
                onChange={(e) => setWipValue(e.target.value)}
                placeholder="e.g. 5"
                className="flex-1 px-2 py-1 border border-[var(--border-secondary)] rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
                onKeyDown={(e) => { if (e.key === 'Enter') handleWipSave(); }}
              />
              <button
                onClick={handleWipSave}
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                {tc('save')}
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="px-3 py-2 border-t border-[var(--border-primary)]">
            <p className="text-xs text-[var(--text-secondary)] mb-1">{t('columnDescription')}</p>
            <textarea
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              placeholder={t('columnDescriptionPlaceholder')}
              rows={2}
              className="w-full px-2 py-1 border border-[var(--border-secondary)] rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
            />
            <button
              onClick={handleDescSave}
              className="mt-1 w-full text-xs text-center py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded"
            >
              {t('columnSaveDescription')}
            </button>
          </div>

          {/* Delete */}
          <div className="border-t border-[var(--border-primary)]">
            <button
              onClick={() => {
                onClose();
                onDelete();
              }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {tc('delete')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  column,
  cards,
  onAddCard,
  onCardClick,
  dragHandleProps,
  dimFiltered,
  totalCards,
  onCollapse,
  onDelete,
  onUpdateColumn,
  onRegisterAddCard,
  selectedCardIds,
  onToggleSelectCard,
  cardEditors,
  boardMembers,
  currentUserId,
  activeCardId,
}: {
  column: Column;
  cards: Card[];
  onAddCard: (title: string) => void;
  onCardClick: (cardId: string) => void;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  dimFiltered: boolean;
  totalCards: number;
  onCollapse: () => void;
  onDelete: () => void;
  onUpdateColumn: (data: { title?: string; color?: string | null; wipLimit?: number | null; description?: string | null }) => void;
  onRegisterAddCard?: (fn: () => void) => void;
  selectedCardIds: Set<string>;
  onToggleSelectCard: (cardId: string) => void;
  cardEditors: Record<string, string>;
  boardMembers: Array<{ userId: string; user: { id: string; name: string; avatarUrl: string | null } }>;
  currentUserId: string | undefined;
  activeCardId?: string | null;
}) {
  const { t } = useTranslation('board');
  const { t: tc } = useTranslation('common');
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // KB: Register the "trigger add card" function for keyboard shortcut 'n'
  useEffect(() => {
    if (onRegisterAddCard) {
      onRegisterAddCard(() => setIsAdding(true));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterAddCard]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAddCard(title.trim());
      setTitle('');
      setIsAdding(false);
    }
  };

  const displayCount = dimFiltered ? `${cards.length}/${totalCards}` : String(cards.length);

  // WP-001: WIP limit warning state
  const isOverWip = column.wipLimit != null && totalCards >= column.wipLimit;

  return (
    <div
      className="flex flex-col rounded-lg h-full bg-[var(--bg-tertiary)]"
      style={
        isOverWip
          ? { borderTop: `3px solid var(--error)` }
          : column.color
          ? { borderTop: `3px solid ${column.color}` }
          : {}
      }
    >
      <div
        {...dragHandleProps}
        className="px-3 py-2 flex items-center justify-between cursor-grab"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-[var(--text-primary)]">{column.title}</h3>
          <span className="text-xs text-[var(--text-tertiary)]">{displayCount}</span>
        </div>
        <div className="relative flex items-center gap-1">
          {column.wipLimit && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${isOverWip ? 'bg-[var(--error-light)] text-[var(--error)] font-semibold' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}
            >
              {isOverWip && (
                <svg
                  className="w-3 h-3 inline mr-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              )}
              {column.wipLimit}
            </span>
          )}
          {/* CL-006: Column settings gear icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSettingsOpen((v) => !v);
            }}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            title="Column settings"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={onCollapse}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-xs ml-1"
            title="Collapse column"
          >
            &laquo;
          </button>

          {/* CL-006: Column settings popover */}
          {settingsOpen && (
            <ColumnSettingsMenu
              column={column}
              onUpdate={onUpdateColumn}
              onDelete={onDelete}
              onClose={() => setSettingsOpen(false)}
            />
          )}
        </div>
      </div>

      <Droppable droppableId={column.id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto px-2 pb-2 min-h-[2rem] ${snapshot.isDraggingOver ? 'bg-[var(--accent-light)]/60' : ''}`}
          >
            {cards.map((card, index) => {
              // AG-001: Card aging
              const agingDays = getCardAgingDays(card);
              const { className: agingClass, showClock } = getCardAgingStyle(agingDays);
              const agingLabel = formatAgingLabel(agingDays);

              // PR-001: Card editing presence
              const editorId = cardEditors[card.id];
              const isEditedByOther = editorId && editorId !== currentUserId;
              const editorMember = boardMembers.find((m) => m.userId === editorId);
              const editorName = editorMember?.user.name ?? editorId;

              // MS-001: Selected state
              const isSelected = selectedCardIds.has(card.id);

              // DS v2.0: Card state computation (snapshot-independent)
              const isOverdueCard = card.dueDate && column.columnType !== 'DONE' && new Date(card.dueDate) < new Date();
              const isDetailOpen = card.id === activeCardId;

              return (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(provided, snapshot) => {
                  // DS v2.0: Build card state className (uses draggable snapshot)
                  let cardStateClass = '';
                  if (snapshot.isDragging) {
                    cardStateClass = 'kanban-card--dragging';
                  } else if (isDetailOpen) {
                    cardStateClass = 'kanban-card--selected';
                  } else if (isOverdueCard) {
                    cardStateClass = 'kanban-card--overdue';
                  }

                  return (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={(e) => {
                      if (isEditedByOther) return;
                      if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        onToggleSelectCard(card.id);
                      } else {
                        onCardClick(card.id);
                      }
                    }}
                    className={`kanban-card ${cardStateClass} p-3 mb-2 cursor-grab
                      ${agingClass}
                      ${isSelected ? 'ring-2 ring-blue-500' : ''}
                      ${isEditedByOther ? 'cursor-not-allowed !border !border-amber-400 ring-1 ring-amber-300' : ''}
                    `}
                  >
                    {/* PR-001: Editing indicator */}
                    {isEditedByOther && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-medium">
                          {editorName?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <span className="text-xs text-amber-600">{t('cardEditing', { name: editorName })}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-1 h-full min-h-[1rem] rounded-full flex-shrink-0 ${PRIORITY_COLORS[card.priority] ?? 'bg-gray-300'}`}
                      />
                      <div className="flex-1 min-w-0">
                        {/* MS-001: Selected badge overlay on title */}
                        {isSelected && snapshot.isDragging && selectedCardIds.size > 1 && (
                          <span className="inline-block mb-1 text-xs bg-blue-600 text-white rounded px-1.5 py-0.5">
                            {selectedCardIds.size} cards
                          </span>
                        )}
                        <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">
                          {card.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs text-[var(--text-tertiary)]">
                            KF-{String(card.cardNumber).padStart(3, '0')}
                          </span>
                          {/* AG-001: Clock icon for stale cards */}
                          {showClock && (
                            <span title={`${agingDays} days since last update`}>
                              <svg
                                className="w-3 h-3 text-[var(--text-tertiary)]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                          )}
                          {card.labels?.map((cl) => (
                            <span
                              key={cl.label.id}
                              className="text-xs px-1.5 py-0.5 rounded text-white"
                              style={{ backgroundColor: cl.label.color }}
                            >
                              {cl.label.name}
                            </span>
                          ))}
                          {(() => {
                            const status = getDueDateStatus(card.dueDate, column.columnType);
                            if (!status) return null;
                            return (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${status.className}`}>
                                {status.label}
                              </span>
                            );
                          })()}
                        </div>
                        {card.assignees && card.assignees.length > 0 && (
                          <div className="flex -space-x-1 mt-2">
                            {card.assignees.map((a) => (
                              <div
                                key={a.user.id}
                                className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-[var(--bg-primary)]"
                                title={a.user.name}
                              >
                                {a.user.name.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* CD-020: Card preview badges */}
                        {card._count &&
                          (card._count.comments > 0 ||
                            card._count.checklists > 0 ||
                            card._count.attachments > 0) && (
                            <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-tertiary)]">
                              {card._count.comments > 0 && (
                                <span
                                  className="flex items-center gap-0.5"
                                  title={`${card._count.comments} comments`}
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                    />
                                  </svg>
                                  {card._count.comments}
                                </span>
                              )}
                              {card._count.checklists > 0 && (
                                <span
                                  className="flex items-center gap-0.5"
                                  title={`${card._count.checklists} checklists`}
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                                    />
                                  </svg>
                                  {card._count.checklists}
                                </span>
                              )}
                              {card._count.attachments > 0 && (
                                <span
                                  className="flex items-center gap-0.5"
                                  title={`${card._count.attachments} attachments`}
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                    />
                                  </svg>
                                  {card._count.attachments}
                                </span>
                              )}
                            </div>
                          )}
                        {/* AG-001: Aging footer label */}
                        {agingLabel && (
                          <p className="text-xs text-[var(--text-tertiary)] mt-1.5">{agingLabel}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                }}
              </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="px-2 pb-2">
        {isAdding ? (
          <form onSubmit={handleAdd}>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('cardTitlePlaceholder')}
              className="w-full px-3 py-2 border border-[var(--border-secondary)] rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsAdding(false);
              }}
            />
            <div className="flex gap-2 mt-1">
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                {tc('add')}
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm"
              >
                {tc('cancel')}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full text-left px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded"
          >
            + {t('addCard')}
          </button>
        )}
      </div>
    </div>
  );
}

function AddColumnButton({ onAdd }: { onAdd: (title: string) => void }) {
  const { t } = useTranslation('board');
  const { t: tc } = useTranslation('common');
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim());
      setTitle('');
      setIsAdding(false);
    }
  };

  if (isAdding) {
    return (
      <div className="w-72 flex-shrink-0">
        <form onSubmit={handleAdd} className="bg-[var(--bg-tertiary)] rounded-lg p-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('columnTitlePlaceholder')}
            className="w-full px-3 py-2 border border-[var(--border-secondary)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsAdding(false);
            }}
          />
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              {tc('add')}
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm"
            >
              {tc('cancel')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-72 flex-shrink-0">
      <button
        onClick={() => setIsAdding(true)}
        className="w-full text-left px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-lg text-sm text-[var(--text-secondary)] font-medium"
      >
        + {t('addColumn')}
      </button>
    </div>
  );
}
