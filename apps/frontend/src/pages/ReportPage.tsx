import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { boardsApi, type Card, type Column } from '@/api/boards';

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-400',
  MEDIUM: 'bg-blue-400',
  LOW: 'bg-gray-400',
};

const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function BarChart({
  rows,
  total,
  colorClass,
}: {
  rows: { label: string; count: number; color?: string }[];
  total: number;
  colorClass?: string;
}) {
  if (total === 0) {
    return <p className="text-sm text-gray-400 italic">No data available.</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
        return (
          <div key={row.label} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-28 truncate flex-shrink-0">{row.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
              <div
                className={`h-4 rounded-full transition-all ${row.color ?? colorClass ?? 'bg-blue-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm text-gray-700 w-16 text-right flex-shrink-0">
              {row.count} <span className="text-gray-400 text-xs">({pct}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportPage() {
  const { boardId } = useParams<{ boardId: string }>();

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardsApi.getById(boardId!),
    enabled: !!boardId,
  });

  const { data: cards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ['cards', boardId],
    queryFn: () => boardsApi.getCards(boardId!),
    enabled: !!boardId,
  });

  const { data: columns = [], isLoading: columnsLoading } = useQuery({
    queryKey: ['columns', boardId],
    queryFn: () => boardsApi.getColumns(boardId!),
    enabled: !!boardId,
  });

  const isLoading = boardLoading || cardsLoading || columnsLoading;

  // 1. Cards per column
  const cardsPerColumn = useMemo(() => {
    const sortedCols = [...columns].sort((a: Column, b: Column) => a.position - b.position);
    return sortedCols.map((col) => ({
      label: col.title,
      count: cards.filter((c: Card) => c.columnId === col.id).length,
    }));
  }, [cards, columns]);

  // 2. Priority distribution
  const priorityDist = useMemo(() => {
    return PRIORITIES.map((p) => ({
      label: p,
      count: cards.filter((c: Card) => c.priority === p).length,
      color: PRIORITY_COLORS[p],
    }));
  }, [cards]);

  // 3. Member workload
  const memberWorkload = useMemo(() => {
    const countMap = new Map<string, { name: string; count: number }>();
    cards.forEach((card: Card) => {
      card.assignees?.forEach((a) => {
        const existing = countMap.get(a.user.id);
        if (existing) {
          existing.count++;
        } else {
          countMap.set(a.user.id, { name: a.user.name, count: 1 });
        }
      });
    });
    return Array.from(countMap.values()).sort((a, b) => b.count - a.count);
  }, [cards]);

  const totalCards = cards.length;
  const totalWithAssignees = memberWorkload.reduce((acc, m) => acc + m.count, 0);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-gray-500">Loading report...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to={`/boards/${boardId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to board
        </Link>
        <h2 className="text-xl font-semibold text-gray-900 mt-2">
          Report: {board?.title}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {totalCards} total cards across {columns.length} columns
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Cards per Column */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Cards per Column</h3>
          <p className="text-xs text-gray-500 mb-4">Distribution of cards across board columns</p>
          <BarChart
            rows={cardsPerColumn}
            total={totalCards}
            colorClass="bg-blue-500"
          />
        </section>

        {/* Section 2: Priority Distribution */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Priority Distribution</h3>
          <p className="text-xs text-gray-500 mb-4">Number of cards by priority level</p>
          <BarChart
            rows={priorityDist}
            total={totalCards}
          />
        </section>

        {/* Section 3: Member Workload */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Member Workload</h3>
          <p className="text-xs text-gray-500 mb-4">
            Cards assigned per member ({totalWithAssignees} card-assignments total)
          </p>
          {memberWorkload.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No cards are assigned to members yet.</p>
          ) : (
            <BarChart
              rows={memberWorkload.map((m) => ({ label: m.name, count: m.count }))}
              total={totalWithAssignees}
              colorClass="bg-purple-500"
            />
          )}
        </section>

        {/* Summary stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Cards" value={totalCards} />
          <StatCard
            label="Overdue"
            value={
              cards.filter(
                (c: Card) =>
                  c.dueDate &&
                  new Date(c.dueDate) < new Date() &&
                  columns.find((col: Column) => col.id === c.columnId)?.columnType !== 'DONE',
              ).length
            }
            accent="text-red-600"
          />
          <StatCard
            label="No Assignee"
            value={cards.filter((c: Card) => !c.assignees || c.assignees.length === 0).length}
          />
          <StatCard
            label="Completed"
            value={
              cards.filter((c: Card) =>
                columns.find((col: Column) => col.id === c.columnId)?.columnType === 'DONE',
              ).length
            }
            accent="text-green-600"
          />
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
      <div className={`text-3xl font-bold ${accent ?? 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
