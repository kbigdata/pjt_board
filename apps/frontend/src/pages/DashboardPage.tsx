import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { workspacesApi } from '@/api/workspaces';
import { boardsApi, type Board, type Card, type Column } from '@/api/boards';
import { activitiesApi, type Activity } from '@/api/activities';

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  LOW: 'bg-gray-100 text-gray-600',
};

function formatDueDate(dueDate: string | null): { label: string; className: string } | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return { label: 'Overdue', className: 'text-red-600 font-semibold' };
  }
  if (diffDays === 0) {
    return { label: 'Due today', className: 'text-amber-600 font-semibold' };
  }
  if (diffDays <= 7) {
    return {
      label: `Due in ${diffDays}d`,
      className: 'text-amber-600',
    };
  }
  return {
    label: due.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    className: 'text-gray-500',
  };
}

// Fetch all boards across all workspaces
function useAllBoards() {
  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspacesApi.list,
  });

  const boardQueries = useQuery({
    queryKey: ['dashboard-boards', workspaces.map((w) => w.id).join(',')],
    queryFn: () =>
      Promise.all(workspaces.map((ws) => boardsApi.list(ws.id))).then((results) =>
        results.flat(),
      ),
    enabled: workspaces.length > 0,
  });

  return { workspaces, boards: boardQueries.data ?? [], isLoading: boardQueries.isLoading };
}

// Fetch all cards across all boards
function useAllCards(boards: Board[]) {
  return useQuery({
    queryKey: ['dashboard-cards', boards.map((b) => b.id).join(',')],
    queryFn: () =>
      Promise.all(
        boards.map((b) =>
          boardsApi
            .getCards(b.id)
            .then((cards) => cards.map((c) => ({ ...c, board: { title: b.title } }))),
        ),
      ).then((results) => results.flat()),
    enabled: boards.length > 0,
  });
}

// Fetch all columns across all boards
function useAllColumns(boards: Board[]) {
  return useQuery({
    queryKey: ['dashboard-columns', boards.map((b) => b.id).join(',')],
    queryFn: () =>
      Promise.all(boards.map((b) => boardsApi.getColumns(b.id))).then((results) =>
        results.flat(),
      ),
    enabled: boards.length > 0,
  });
}

// Fetch recent activities across all boards
function useRecentActivities(boards: Board[]) {
  return useQuery({
    queryKey: ['dashboard-activities', boards.map((b) => b.id).join(',')],
    queryFn: () =>
      Promise.all(boards.map((b) => activitiesApi.list(b.id, 5))).then((results) =>
        results
          .flat()
          .sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 20),
      ),
    enabled: boards.length > 0,
  });
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { boards, isLoading: boardsLoading } = useAllBoards();
  const { data: allCards = [], isLoading: cardsLoading } = useAllCards(boards);
  const { data: allColumns = [], isLoading: columnsLoading } = useAllColumns(boards);
  const { data: recentActivities = [], isLoading: activitiesLoading } = useRecentActivities(boards);

  const isLoading = boardsLoading || cardsLoading || columnsLoading;

  // Column lookup map
  const columnMap = useMemo(() => {
    const map = new Map<string, Column>();
    allColumns.forEach((col) => map.set(col.id, col));
    return map;
  }, [allColumns]);

  // My assigned cards
  const myAssignedCards = useMemo(() => {
    if (!user) return [];
    return allCards.filter(
      (card) =>
        card.assignees?.some((a) => a.user.id === user.id) && !card.archivedAt,
    );
  }, [allCards, user]);

  // Due soon (next 7 days, not done, not archived)
  const dueSoonCards = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return allCards
      .filter((card) => {
        if (!card.dueDate || card.archivedAt) return false;
        const due = new Date(card.dueDate);
        const col = columnMap.get(card.columnId);
        if (col?.columnType === 'DONE') return false;
        return due <= sevenDaysFromNow;
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [allCards, columnMap]);

  // Board stats
  const boardStats = useMemo(() => {
    return boards.map((board) => {
      const boardCards = allCards.filter((c) => c.boardId === board.id && !c.archivedAt);
      const now = new Date();
      const overdueCount = boardCards.filter((c) => {
        if (!c.dueDate) return false;
        const col = columnMap.get(c.columnId);
        if (col?.columnType === 'DONE') return false;
        return new Date(c.dueDate) < now;
      }).length;
      return {
        board,
        cardCount: boardCards.length,
        overdueCount,
        memberCount: board._count?.members ?? 0,
      };
    });
  }, [boards, allCards, columnMap]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Dashboard
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {user?.name}. Here is your workspace overview.
        </p>
      </div>

      {/* My Assigned Cards */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          My Assigned Cards
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({myAssignedCards.length})
          </span>
        </h3>
        {myAssignedCards.length === 0 ? (
          <div className="bg-white border rounded-lg p-6 text-center text-gray-400 text-sm">
            No cards assigned to you.
          </div>
        ) : (
          <div className="bg-white border rounded-lg divide-y">
            {myAssignedCards.slice(0, 10).map((card) => {
              const dueDateInfo = formatDueDate(card.dueDate);
              return (
                <div key={card.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        KF-{String(card.cardNumber).padStart(3, '0')}
                      </span>
                      <span className="text-xs text-gray-400">&middot;</span>
                      <span className="text-xs text-gray-500 truncate">
                        {(card as Card & { board?: { title: string } }).board?.title}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mt-0.5 truncate">{card.title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        PRIORITY_BADGE[card.priority] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {card.priority}
                    </span>
                    {dueDateInfo && (
                      <span className={`text-xs ${dueDateInfo.className}`}>
                        {dueDateInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {myAssignedCards.length > 10 && (
              <div className="px-4 py-2 text-xs text-gray-400 text-center">
                +{myAssignedCards.length - 10} more cards
              </div>
            )}
          </div>
        )}
      </section>

      {/* Due Soon */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          Due Soon
          <span className="ml-2 text-sm font-normal text-gray-400">
            (next 7 days &mdash; {dueSoonCards.length} cards)
          </span>
        </h3>
        {dueSoonCards.length === 0 ? (
          <div className="bg-white border rounded-lg p-6 text-center text-gray-400 text-sm">
            No cards due in the next 7 days.
          </div>
        ) : (
          <div className="bg-white border rounded-lg divide-y">
            {dueSoonCards.map((card) => {
              const dueDateInfo = formatDueDate(card.dueDate);
              return (
                <div key={card.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        KF-{String(card.cardNumber).padStart(3, '0')}
                      </span>
                      <span className="text-xs text-gray-400">&middot;</span>
                      <span className="text-xs text-gray-500 truncate">
                        {(card as Card & { board?: { title: string } }).board?.title}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mt-0.5 truncate">{card.title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        PRIORITY_BADGE[card.priority] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {card.priority}
                    </span>
                    {dueDateInfo && (
                      <span className={`text-xs ${dueDateInfo.className}`}>
                        {dueDateInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-3">Recent Activity</h3>
        {activitiesLoading ? (
          <div className="text-sm text-gray-400">Loading activities...</div>
        ) : recentActivities.length === 0 ? (
          <div className="bg-white border rounded-lg p-6 text-center text-gray-400 text-sm">
            No recent activity.
          </div>
        ) : (
          <div className="bg-white border rounded-lg divide-y">
            {recentActivities.map((activity: Activity) => (
              <div key={activity.id} className="flex items-start gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-medium flex-shrink-0 mt-0.5">
                  {activity.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{activity.user.name}</span>{' '}
                    <span className="text-gray-500">{activity.action.replace(/_/g, ' ').toLowerCase()}</span>
                    {activity.card && (
                      <>
                        {' '}
                        <span className="font-medium text-gray-700">
                          KF-{String(activity.card.cardNumber).padStart(3, '0')} {activity.card.title}
                        </span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(activity.createdAt).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Board Summary */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          Board Summary
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({boards.length} boards)
          </span>
        </h3>
        {boardStats.length === 0 ? (
          <div className="bg-white border rounded-lg p-6 text-center text-gray-400 text-sm">
            No boards yet.{' '}
            <Link to="/" className="text-blue-600 hover:underline">
              Go to Workspaces
            </Link>{' '}
            to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boardStats.map(({ board, cardCount, overdueCount, memberCount }) => (
              <Link
                key={board.id}
                to={`/boards/${board.id}`}
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h4 className="font-semibold text-gray-900 truncate">{board.title}</h4>
                {board.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{board.description}</p>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">{cardCount}</div>
                    <div className="text-xs text-gray-400">Cards</div>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-xl font-bold ${
                        overdueCount > 0 ? 'text-red-600' : 'text-gray-900'
                      }`}
                    >
                      {overdueCount}
                    </div>
                    <div className="text-xs text-gray-400">Overdue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">{memberCount}</div>
                    <div className="text-xs text-gray-400">Members</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
