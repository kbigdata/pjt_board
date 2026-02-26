import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import { workspacesApi } from '@/api/workspaces';
import { boardsApi, type Board, type Card, type Column } from '@/api/boards';
import { activitiesApi, type Activity } from '@/api/activities';

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400',
};

function formatDueDate(
  dueDate: string | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
  locale: string,
): { label: string; className: string } | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return { label: t('dueDate.overdue'), className: 'text-red-600 font-semibold' };
  }
  if (diffDays === 0) {
    return { label: t('dueDate.dueToday'), className: 'text-amber-600 font-semibold' };
  }
  if (diffDays <= 7) {
    return {
      label: t('dueDate.dueInDays', { count: diffDays }),
      className: 'text-amber-600',
    };
  }
  return {
    label: due.toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
    className: 'text-[var(--text-tertiary)]',
  };
}

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
          .slice(0, 10),
      ),
    enabled: boards.length > 0,
  });
}

export default function WorkspacesPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { t, i18n } = useTranslation('dashboard');
  const { t: tb } = useTranslation('board');
  const { t: tc } = useTranslation('common');

  const { workspaces, boards, isLoading: boardsLoading } = useAllBoards();
  const { data: allCards = [], isLoading: cardsLoading } = useAllCards(boards);
  const { data: allColumns = [] } = useAllColumns(boards);
  const { data: recentActivities = [], isLoading: activitiesLoading } = useRecentActivities(boards);

  const isLoading = boardsLoading || cardsLoading;

  const createMutation = useMutation({
    mutationFn: workspacesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setShowCreate(false);
      setName('');
      setDescription('');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, description: description || undefined });
  };

  const columnMap = useMemo(() => {
    const map = new Map<string, Column>();
    allColumns.forEach((col) => map.set(col.id, col));
    return map;
  }, [allColumns]);

  const myAssignedCards = useMemo(() => {
    if (!user) return [];
    return allCards.filter(
      (card) =>
        card.assignees?.some((a) => a.user.id === user.id) && !card.archivedAt,
    );
  }, [allCards, user]);

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

  const overdueCards = useMemo(() => {
    const now = new Date();
    return allCards.filter((card) => {
      if (!card.dueDate || card.archivedAt) return false;
      const col = columnMap.get(card.columnId);
      if (col?.columnType === 'DONE') return false;
      return new Date(card.dueDate) < now;
    });
  }, [allCards, columnMap]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-[var(--text-secondary)]">{tc('loading')}</div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {t('welcome', { name: user?.name })}
        </h2>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">{today}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('boardSummary'), value: boards.length },
          { label: t('myAssignedCards'), value: myAssignedCards.length },
          { label: t('dueSoon'), value: dueSoonCards.length },
          { label: t('cards.overdueCards'), value: overdueCards.length, highlight: overdueCards.length > 0 },
        ].map((stat) => (
          <div key={stat.label} className="bg-[var(--bg-primary)] rounded-lg shadow-sm border border-[var(--border-primary)] p-4">
            <div className="text-sm text-[var(--text-tertiary)]">{stat.label}</div>
            <div className={`text-2xl font-bold mt-1 ${stat.highlight ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* My Assigned Cards + Due Soon (2-column) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Assigned Cards */}
        <section>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
            {t('myAssignedCards')}
            <span className="ml-2 text-sm font-normal text-[var(--text-tertiary)]">
              ({myAssignedCards.length})
            </span>
          </h3>
          {myAssignedCards.length === 0 ? (
            <div className="bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-lg p-6 text-center text-[var(--text-tertiary)] text-sm">
              {t('noAssignedCards')}
            </div>
          ) : (
            <div className="bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-lg divide-y divide-[var(--border-secondary)]">
              {myAssignedCards.slice(0, 5).map((card) => {
                const dueDateInfo = formatDueDate(card.dueDate, t, i18n.language);
                return (
                  <Link key={card.id} to={`/boards/${card.boardId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-tertiary)]">
                          KF-{String(card.cardNumber).padStart(3, '0')}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)]">&middot;</span>
                        <span className="text-xs text-[var(--text-secondary)] truncate">
                          {(card as Card & { board?: { title: string } }).board?.title}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] mt-0.5 truncate">{card.title}</p>
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
                  </Link>
                );
              })}
              {myAssignedCards.length > 5 && (
                <div className="px-4 py-2 text-xs text-[var(--text-tertiary)] text-center">
                  {t('moreCards', { count: myAssignedCards.length - 5 })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Due Soon */}
        <section>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
            {t('dueSoon')}
            <span className="ml-2 text-sm font-normal text-[var(--text-tertiary)]">
              ({t('dueSoonDesc', { count: dueSoonCards.length })})
            </span>
          </h3>
          {dueSoonCards.length === 0 ? (
            <div className="bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-lg p-6 text-center text-[var(--text-tertiary)] text-sm">
              {t('noDueSoon')}
            </div>
          ) : (
            <div className="bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-lg divide-y divide-[var(--border-secondary)]">
              {dueSoonCards.slice(0, 5).map((card) => {
                const dueDateInfo = formatDueDate(card.dueDate, t, i18n.language);
                return (
                  <Link key={card.id} to={`/boards/${card.boardId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-tertiary)]">
                          KF-{String(card.cardNumber).padStart(3, '0')}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)]">&middot;</span>
                        <span className="text-xs text-[var(--text-secondary)] truncate">
                          {(card as Card & { board?: { title: string } }).board?.title}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] mt-0.5 truncate">{card.title}</p>
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
                  </Link>
                );
              })}
              {dueSoonCards.length > 5 && (
                <div className="px-4 py-2 text-xs text-[var(--text-tertiary)] text-center">
                  {t('moreCards', { count: dueSoonCards.length - 5 })}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Recent Activity */}
      <section>
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
          {t('recentActivity')}
        </h3>
        {activitiesLoading ? (
          <div className="text-sm text-[var(--text-tertiary)]">{t('loadingActivities')}</div>
        ) : recentActivities.length === 0 ? (
          <div className="bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-lg p-6 text-center text-[var(--text-tertiary)] text-sm">
            {t('noRecentActivity')}
          </div>
        ) : (
          <div className="bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-lg divide-y divide-[var(--border-secondary)]">
            {recentActivities.map((activity: Activity) => (
              <div key={activity.id} className="flex items-start gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 text-xs font-medium flex-shrink-0 mt-0.5">
                  {activity.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="font-medium">{activity.user.name}</span>{' '}
                    <span className="text-[var(--text-secondary)]">{activity.action.replace(/_/g, ' ').toLowerCase()}</span>
                    {activity.card && (
                      <>
                        {' '}
                        <span className="font-medium text-[var(--text-primary)]">
                          KF-{String(activity.card.cardNumber).padStart(3, '0')} {activity.card.title}
                        </span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {new Date(activity.createdAt).toLocaleString(i18n.language, {
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

      {/* Workspaces */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {tb('workspace.myWorkspaces')}
          </h3>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            {tb('workspace.newWorkspace')}
          </button>
        </div>

        {showCreate && (
          <div className="bg-[var(--bg-primary)] rounded-lg shadow-sm border border-[var(--border-primary)] p-4 mb-6">
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tb('workspace.namePlaceholder')}
                className="w-full px-3 py-2 border border-[var(--border-secondary)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoFocus
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tb('workspace.descriptionPlaceholder')}
                className="w-full px-3 py-2 border border-[var(--border-secondary)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {tc('save')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm"
                >
                  {tc('cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {!workspaces?.length ? (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            <p>{tb('workspace.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws) => (
              <Link
                key={ws.id}
                to={`/workspaces/${ws.id}`}
                className="bg-[var(--bg-primary)] rounded-lg shadow-sm border border-[var(--border-primary)] p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-[var(--text-primary)]">{ws.name}</h3>
                {ws.description && (
                  <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                    {ws.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs text-[var(--text-tertiary)]">
                  <span>{ws.memberCount ?? 0} {tb('members')}</span>
                  <span>{tb('workspace.boardCount', { count: ws.boardCount ?? 0 })}</span>
                  <span className="uppercase">{ws.myRole}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
