import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableProvidedDragHandleProps,
} from '@hello-pangea/dnd';
import { boardsApi, type Card, type Column } from '@/api/boards';
import { useSwimlanes } from '@/hooks/useSwimlanes';
import { type Swimlane } from '@/api/swimlanes';
import CardDetailModal from '@/components/CardDetailModal';
import ActivityFeed from '@/components/ActivityFeed';
import ArchiveDrawer from '@/components/ArchiveDrawer';
import { useBoardSocket } from '@/hooks/useSocket';
import { useColumnCollapseStore } from '@/stores/columnCollapse';

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
      className: 'bg-green-100 text-green-700',
    };
  }

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) return { label: 'Overdue', className: 'bg-red-100 text-red-700' };
  if (diffHours <= 24) return { label: 'Due soon', className: 'bg-amber-100 text-amber-700' };
  if (diffDays === 0) return { label: 'Due today', className: 'bg-orange-100 text-orange-700' };
  if (diffDays <= 3) return { label: `D-${diffDays}`, className: 'bg-yellow-100 text-yellow-700' };
  return {
    label: due.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    className: 'bg-gray-100 text-gray-500',
  };
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
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Real-time sync
  useBoardSocket(boardId);

  const [activityOpen, setActivityOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const { toggleColumn, isCollapsed } = useColumnCollapseStore();

  // SF-002: Advanced filter panel toggle
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<FilterState>(getEmptyFilters());

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

  // DD-012: Auto-scroll refs
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardsApi.getById(boardId!),
    enabled: !!boardId,
  });

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
        <div className="text-gray-500">Loading board...</div>
      </div>
    );
  }

  const sortedColumns = [...(columns ?? board?.columns ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Board header */}
      <div className="px-4 py-3 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/workspaces/${board?.workspaceId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; Back
          </Link>
          <h2 className="text-lg font-semibold text-gray-900">{board?.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSwimlaneMode((v) => !v)}
            className={`text-sm px-3 py-1 rounded ${swimlaneMode ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Swimlanes
          </button>
          <button
            onClick={() => setArchiveOpen((v) => !v)}
            className={`text-sm px-3 py-1 rounded ${archiveOpen ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Archive
          </button>
          <button
            onClick={() => setActivityOpen((v) => !v)}
            className={`text-sm px-3 py-1 rounded ${activityOpen ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Activity
          </button>
        </div>
      </div>

      {/* SF-002: Filter bar */}
      <div className="px-4 py-2 border-b bg-white flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => setFilters((f) => ({ ...f, searchQuery: e.target.value }))}
          placeholder="Search cards..."
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        {/* SF-002: Advanced filters toggle button */}
        <button
          onClick={() => setShowFilterPanel((v) => !v)}
          className={`relative text-sm px-3 py-1.5 rounded border transition-colors ${
            showFilterPanel || activeFilterCount > 0
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'border-gray-300 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filters
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
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
          >
            Clear all
          </button>
        )}
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
      <div ref={boardScrollRef} className="flex-1 overflow-auto p-4">
        <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
          {swimlaneMode ? (
            <SwimlaneBoard
              columns={sortedColumns}
              swimlanes={swimlanes}
              cards={filteredCards}
              allCards={cards ?? []}
              onCardClick={(cardId) => setSelectedCardId(cardId)}
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
                                onCardClick={(cardId) => setSelectedCardId(cardId)}
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
      </div>

      {selectedCardId && (
        <CardDetailModal cardId={selectedCardId} onClose={() => setSelectedCardId(null)} />
      )}

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
  const toggleSet = <T,>(set: Set<T>, item: T): Set<T> => {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  };

  return (
    <div className="px-4 py-3 border-b bg-gray-50 flex flex-wrap gap-6">
      {/* Priority multi-select */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Priority</p>
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
                  : 'text-gray-600 border-gray-300 hover:border-gray-400'
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
          <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Assignee</p>
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
                    : 'text-gray-600 border-gray-300 hover:border-gray-400'
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
          <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Label</p>
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
                    : 'text-gray-600 border-gray-300 hover:border-gray-400'
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
        <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Due Date</p>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.dueDateStart}
            onChange={(e) => onFiltersChange({ ...filters, dueDateStart: e.target.value })}
            className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={filters.dueDateEnd}
            onChange={(e) => onFiltersChange({ ...filters, dueDateEnd: e.target.value })}
            className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.hasDueDate}
            onChange={(e) => onFiltersChange({ ...filters, hasDueDate: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-xs text-gray-600">Has due date</span>
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
      <div className="flex sticky top-0 z-10 bg-white border-b">
        <div className="w-40 flex-shrink-0 px-3 py-2 font-medium text-sm text-gray-500 border-r">
          Swimlane
        </div>
        {columns.map((col) => (
          <div
            key={col.id}
            className="w-60 flex-shrink-0 px-3 py-2 font-medium text-sm text-gray-700 border-r"
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
          <div key={lane.id} className="border-b">
            <div className="flex">
              {/* Swimlane row header */}
              <div className="w-40 flex-shrink-0 px-3 py-2 bg-gray-50 border-r flex items-center gap-2">
                <button
                  onClick={() => onToggleSwimlane(lane.id)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  {isCollapsed ? '\u25B6' : '\u25BC'}
                </button>
                <span className="text-sm font-medium text-gray-700 truncate">{lane.title}</span>
                <span className="text-xs text-gray-400">({laneCards.length})</span>
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
                          className={`w-60 flex-shrink-0 border-r p-1.5 min-h-[4rem] ${
                            snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-white'
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
                                  className={`bg-white rounded shadow-sm border p-2 mb-1.5 cursor-grab text-xs ${
                                    snapshot.isDragging
                                      ? 'shadow-lg rotate-1'
                                      : 'hover:shadow-md'
                                  }`}
                                >
                                  <p className="font-medium text-gray-900 leading-snug">
                                    {card.title}
                                  </p>
                                  <span className="text-gray-400">
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
                <div className="flex-1 bg-gray-50 px-3 py-1 text-xs text-gray-400 flex items-center">
                  {laneCards.length} cards - Click arrow to expand
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
              placeholder="Swimlane title..."
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAddingLane(false)}
              className="text-sm text-gray-500"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAddingLane(true)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            + Add swimlane
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
  const [targetColumnId, setTargetColumnId] = useState('');
  const otherColumns = columns.filter((c) => c.id !== columnId);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Delete column "{columnTitle}"
        </h3>
        {hasCards ? (
          <>
            <p className="text-sm text-gray-600 mb-4">
              This column has cards. Where should they be moved?
            </p>
            <select
              value={targetColumnId}
              onChange={(e) => setTargetColumnId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a column...</option>
              {otherColumns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.title}
                </option>
              ))}
            </select>
          </>
        ) : (
          <p className="text-sm text-gray-600 mb-4">
            This column has no cards and will be permanently deleted.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(hasCards ? targetColumnId || undefined : undefined)}
            disabled={isPending || (hasCards && !targetColumnId)}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Deleting...' : 'Delete'}
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
      className="flex flex-col bg-gray-100 rounded-lg h-full items-center"
      style={column.color ? { borderTop: `3px solid ${column.color}` } : {}}
    >
      <div {...dragHandleProps} className="w-full px-1 py-2 flex justify-center cursor-grab">
        <button
          onClick={onExpand}
          className="text-gray-400 hover:text-gray-600 text-xs"
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
        className="py-2 text-xs font-medium text-gray-500"
        style={{ writingMode: 'vertical-rl' }}
      >
        {column.title}
      </div>
      <div className="pb-2">
        <span className="text-xs bg-gray-200 text-gray-600 rounded-full w-5 h-5 flex items-center justify-center">
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
      className="absolute right-0 top-full mt-1 z-30 bg-white rounded-lg shadow-lg border border-gray-200 w-56"
      onClick={(e) => e.stopPropagation()}
    >
      {tab === 'color' ? (
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setTab('main')} className="text-gray-400 hover:text-gray-600 text-xs">
              &larr;
            </button>
            <span className="text-sm font-medium text-gray-700">Set color</span>
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
              className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-500 text-xs"
              title="No color"
            >
              &times;
            </button>
          </div>
        </div>
      ) : (
        <div className="py-1">
          {/* Rename */}
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Rename</p>
            <div className="flex gap-1">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') onClose();
                }}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleRename}
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>

          {/* Color */}
          <button
            onClick={() => setTab('color')}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <span
              className="w-3 h-3 rounded-full border border-gray-300"
              style={column.color ? { backgroundColor: column.color } : { backgroundColor: 'transparent' }}
            />
            Set color
          </button>

          {/* WIP limit */}
          <div className="px-3 py-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">WIP limit (blank to remove)</p>
            <div className="flex gap-1">
              <input
                type="number"
                min="1"
                value={wipValue}
                onChange={(e) => setWipValue(e.target.value)}
                placeholder="e.g. 5"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => { if (e.key === 'Enter') handleWipSave(); }}
              />
              <button
                onClick={handleWipSave}
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                Set
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="px-3 py-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <textarea
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              placeholder="Column description..."
              rows={2}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleDescSave}
              className="mt-1 w-full text-xs text-center py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded"
            >
              Save description
            </button>
          </div>

          {/* Delete */}
          <div className="border-t border-gray-100">
            <button
              onClick={() => {
                onClose();
                onDelete();
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete column
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
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      className={`flex flex-col rounded-lg h-full ${isOverWip ? 'bg-red-50 ring-2 ring-red-200' : 'bg-gray-100'}`}
      style={column.color ? { borderTop: `3px solid ${column.color}` } : {}}
    >
      <div
        {...dragHandleProps}
        className={`px-3 py-2 flex items-center justify-between cursor-grab ${isOverWip ? 'bg-red-100 rounded-t-lg' : ''}`}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-gray-700">{column.title}</h3>
          <span className="text-xs text-gray-400">{displayCount}</span>
        </div>
        <div className="relative flex items-center gap-1">
          {column.wipLimit && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${isOverWip ? 'bg-red-200 text-red-700 font-semibold' : 'bg-gray-200 text-gray-500'}`}
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
            className="text-gray-300 hover:text-gray-500 transition-colors"
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
            className="text-gray-400 hover:text-gray-600 text-xs ml-1"
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
            className={`flex-1 overflow-y-auto px-2 pb-2 min-h-[2rem] ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
          >
            {cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onCardClick(card.id)}
                    className={`bg-white rounded-lg shadow-sm border p-3 mb-2 cursor-grab ${snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'}`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-1 h-full min-h-[1rem] rounded-full ${PRIORITY_COLORS[card.priority] ?? 'bg-gray-300'}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug">
                          {card.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs text-gray-400">
                            KF-{String(card.cardNumber).padStart(3, '0')}
                          </span>
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
                                className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
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
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
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
                      </div>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
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
              placeholder="Enter a title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 text-gray-500 hover:text-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-200 rounded"
          >
            + Add a card
          </button>
        )}
      </div>
    </div>
  );
}

function AddColumnButton({ onAdd }: { onAdd: (title: string) => void }) {
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
        <form onSubmit={handleAdd} className="bg-gray-100 rounded-lg p-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Column title..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1 text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
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
        className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-500 font-medium"
      >
        + Add column
      </button>
    </div>
  );
}
