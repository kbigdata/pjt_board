import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { boardsApi, type Card, type Column } from '@/api/boards';
import { reportsApi, type CFDDataPoint, type LeadTimeEntry, type ThroughputEntry } from '@/api/reports';

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-400',
  MEDIUM: 'bg-blue-400',
  LOW: 'bg-gray-400',
};

const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

// Color palette for CFD stacked columns
const CFD_COLORS = [
  'bg-blue-400',
  'bg-green-400',
  'bg-purple-400',
  'bg-amber-400',
  'bg-pink-400',
  'bg-teal-400',
  'bg-orange-400',
  'bg-indigo-400',
];

const CFD_TEXT_COLORS = [
  'text-blue-700',
  'text-green-700',
  'text-purple-700',
  'text-amber-700',
  'text-pink-700',
  'text-teal-700',
  'text-orange-700',
  'text-indigo-700',
];

const CFD_BG_LIGHT = [
  'bg-blue-100',
  'bg-green-100',
  'bg-purple-100',
  'bg-amber-100',
  'bg-pink-100',
  'bg-teal-100',
  'bg-orange-100',
  'bg-indigo-100',
];

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function BarChart({
  rows,
  total,
  colorClass,
  t,
}: {
  rows: { label: string; count: number; color?: string }[];
  total: number;
  colorClass?: string;
  t: (key: string) => string;
}) {
  if (total === 0) {
    return <p className="text-sm text-[var(--text-tertiary)] italic">{t('noData')}</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
        return (
          <div key={row.label} className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)] w-28 truncate flex-shrink-0">{row.label}</span>
            <div className="flex-1 bg-[var(--bg-hover)] rounded-full h-4 relative overflow-hidden">
              <div
                className={`h-4 rounded-full transition-all ${row.color ?? colorClass ?? 'bg-blue-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm text-[var(--text-primary)] w-16 text-right flex-shrink-0">
              {row.count} <span className="text-[var(--text-tertiary)] text-xs">({pct}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Cumulative Flow Diagram — stacked bar per date
function CFDChart({ data, t }: { data: CFDDataPoint[]; t: (key: string, opts?: Record<string, unknown>) => string }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-[var(--text-tertiary)] italic">{t('cfdNoData')}</p>;
  }

  // Collect all column titles
  const allColumns = useMemo(() => {
    const seen = new Map<string, string>();
    data.forEach((point) => {
      point.columns.forEach((col) => {
        if (!seen.has(col.columnId)) seen.set(col.columnId, col.columnTitle);
      });
    });
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }));
  }, [data]);

  // Find max total per date for scaling
  const maxTotal = useMemo(() => {
    return Math.max(
      ...data.map((point) => point.columns.reduce((sum, col) => sum + col.count, 0)),
      1,
    );
  }, [data]);

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {allColumns.map((col, idx) => (
          <div key={col.id} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${CFD_COLORS[idx % CFD_COLORS.length]}`} />
            <span className="text-xs text-[var(--text-secondary)]">{col.title}</span>
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="overflow-x-auto">
        <div className="flex items-end gap-1 min-w-0" style={{ minHeight: 160 }}>
          {data.map((point) => {
            const total = point.columns.reduce((sum, col) => sum + col.count, 0);
            const heightPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
            return (
              <div
                key={point.date}
                className="flex flex-col-reverse flex-shrink-0 group relative"
                style={{ width: `${Math.max(100 / data.length, 2)}%`, minWidth: 20, height: 160 }}
                title={`${point.date}: ${total} total`}
              >
                {/* Stacked segments */}
                <div
                  className="w-full flex flex-col-reverse rounded-t overflow-hidden"
                  style={{ height: `${heightPct}%` }}
                >
                  {allColumns.map((col, idx) => {
                    const colData = point.columns.find((c) => c.columnId === col.id);
                    const count = colData?.count ?? 0;
                    const segPct = total > 0 ? (count / total) * 100 : 0;
                    if (segPct === 0) return null;
                    return (
                      <div
                        key={col.id}
                        className={`w-full ${CFD_COLORS[idx % CFD_COLORS.length]} opacity-80`}
                        style={{ height: `${segPct}%` }}
                        title={`${col.title}: ${count}`}
                      />
                    );
                  })}
                </div>

                {/* Date label - shown for first, last, and every few */}
                <div className="absolute -bottom-5 left-0 right-0 text-center">
                  <span className="text-[var(--text-tertiary)]" style={{ fontSize: 9 }}>
                    {point.date.slice(5)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="h-6" />

      {/* Table summary */}
      {data.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-secondary)]">
                <th className="text-left py-1 pr-3 text-[var(--text-tertiary)] font-medium">{t('column')}</th>
                <th className="text-right py-1 px-2 text-[var(--text-tertiary)] font-medium">{t('latest')}</th>
                <th className="text-right py-1 px-2 text-[var(--text-tertiary)] font-medium">{t('change')}</th>
              </tr>
            </thead>
            <tbody>
              {allColumns.map((col, idx) => {
                const latest = data[data.length - 1]?.columns.find((c) => c.columnId === col.id)?.count ?? 0;
                const first = data[0]?.columns.find((c) => c.columnId === col.id)?.count ?? 0;
                const change = latest - first;
                return (
                  <tr key={col.id} className="border-b border-[var(--border-primary)]">
                    <td className="py-1 pr-3">
                      <span className={`inline-flex items-center gap-1.5 ${CFD_TEXT_COLORS[idx % CFD_TEXT_COLORS.length]}`}>
                        <span className={`w-2 h-2 rounded-sm inline-block ${CFD_COLORS[idx % CFD_COLORS.length]}`} />
                        {col.title}
                      </span>
                    </td>
                    <td className="text-right py-1 px-2 text-[var(--text-primary)]">{latest}</td>
                    <td className={`text-right py-1 px-2 ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-[var(--text-tertiary)]'}`}>
                      {change > 0 ? `+${change}` : change}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Lead Time Distribution — histogram
const LEAD_TIME_BUCKETS = [
  { label: '0-1h', min: 0, max: 1 },
  { label: '1-4h', min: 1, max: 4 },
  { label: '4-24h', min: 4, max: 24 },
  { label: '1-3d', min: 24, max: 72 },
  { label: '3-7d', min: 72, max: 168 },
  { label: '7d+', min: 168, max: Infinity },
];

function LeadTimeChart({ data, t }: { data: LeadTimeEntry[]; t: (key: string, opts?: Record<string, unknown>) => string }) {
  const buckets = useMemo(() => {
    return LEAD_TIME_BUCKETS.map((b) => ({
      label: b.label,
      count: data.filter((d) => d.leadTimeHours >= b.min && d.leadTimeHours < b.max).length,
    }));
  }, [data]);

  const total = data.length;

  if (total === 0) {
    return <p className="text-sm text-[var(--text-tertiary)] italic">{t('leadTimeNoData')}</p>;
  }

  const avgHours = total > 0 ? data.reduce((sum, d) => sum + d.leadTimeHours, 0) / total : 0;
  const avgLabel =
    avgHours < 1
      ? `${Math.round(avgHours * 60)}m`
      : avgHours < 24
      ? `${avgHours.toFixed(1)}h`
      : `${(avgHours / 24).toFixed(1)}d`;

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 text-sm text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-primary)]">
          {t('cardsCompleted', { count: total })}
        </span>
        <span className="font-semibold text-[var(--text-primary)]">
          {t('avgLeadTime', { time: avgLabel })}
        </span>
      </div>
      <BarChart rows={buckets} total={total} colorClass="bg-purple-500" t={t as (key: string) => string} />
    </div>
  );
}

// Throughput chart — bar chart showing cards completed per day
function ThroughputChart({ data, t }: { data: ThroughputEntry[]; t: (key: string, opts?: Record<string, unknown>) => string }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-[var(--text-tertiary)] italic">{t('throughputNoData')}</p>;
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const avg = data.length > 0 ? total / data.length : 0;

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 text-sm text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-primary)]">
          {t('totalCompleted', { count: total })}
        </span>
        <span className="font-semibold text-[var(--text-primary)]">
          {t('avgPerDay', { count: avg.toFixed(1) })}
        </span>
      </div>
      <div className="flex items-end gap-1 overflow-x-auto" style={{ height: 120 }}>
        {data.map((entry) => {
          const heightPct = (entry.count / max) * 100;
          return (
            <div
              key={entry.date}
              className="flex flex-col items-center flex-shrink-0 group relative"
              style={{ width: `${Math.max(100 / data.length, 2)}%`, minWidth: 16, height: '100%' }}
            >
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full bg-blue-400 hover:bg-blue-500 rounded-t transition-colors"
                  style={{ height: `${heightPct}%` }}
                  title={`${entry.date}: ${entry.count} cards`}
                />
              </div>
              {entry.count > 0 && (
                <span className="absolute -top-4 text-center text-[var(--text-primary)] font-medium" style={{ fontSize: 9 }}>
                  {entry.count}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Date axis labels */}
      <div className="flex gap-1 overflow-x-auto mt-1">
        {data.map((entry) => (
          <div
            key={entry.date}
            className="flex-shrink-0 text-center"
            style={{ width: `${Math.max(100 / data.length, 2)}%`, minWidth: 16 }}
          >
            <span className="text-[var(--text-tertiary)]" style={{ fontSize: 9 }}>
              {entry.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { t } = useTranslation('report');
  const defaultRange = getDefaultDateRange();
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);

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

  const { data: cfdData = [], isLoading: cfdLoading } = useQuery({
    queryKey: ['report-cfd', boardId, fromDate, toDate],
    queryFn: () => reportsApi.getCFD(boardId!, fromDate, toDate),
    enabled: !!boardId && !!fromDate && !!toDate,
    retry: false,
  });

  const { data: leadTimeData = [], isLoading: leadTimeLoading } = useQuery({
    queryKey: ['report-leadtime', boardId, fromDate, toDate],
    queryFn: () => reportsApi.getLeadTime(boardId!, fromDate, toDate),
    enabled: !!boardId && !!fromDate && !!toDate,
    retry: false,
  });

  const { data: throughputData = [], isLoading: throughputLoading } = useQuery({
    queryKey: ['report-throughput', boardId, fromDate, toDate],
    queryFn: () => reportsApi.getThroughput(boardId!, fromDate, toDate),
    enabled: !!boardId && !!fromDate && !!toDate,
    retry: false,
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
        <div className="text-[var(--text-secondary)]">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to={`/boards/${boardId}`}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          &larr; {t('backToBoard')}
        </Link>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-2">
          {t('report', { name: board?.title })}
        </h2>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          {t('totalCardsAcross', { cards: totalCards, columns: columns.length })}
        </p>
      </div>

      <div className="space-y-8">
        {/* Summary stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label={t('totalCards')} value={totalCards} />
          <StatCard
            label={t('overdue')}
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
            label={t('noAssignee')}
            value={cards.filter((c: Card) => !c.assignees || c.assignees.length === 0).length}
          />
          <StatCard
            label={t('completed')}
            value={
              cards.filter((c: Card) =>
                columns.find((col: Column) => col.id === c.columnId)?.columnType === 'DONE',
              ).length
            }
            accent="text-green-600"
          />
        </section>

        {/* Section 1: Cards per Column */}
        <section className="bg-[var(--bg-primary)] rounded-lg shadow-sm border border-[var(--border-secondary)] p-6">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{t('cardsPerColumn')}</h3>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">{t('cardsPerColumnDesc')}</p>
          <BarChart
            rows={cardsPerColumn}
            total={totalCards}
            colorClass="bg-blue-500"
            t={t as (key: string) => string}
          />
        </section>

        {/* Section 2: Priority Distribution */}
        <section className="bg-[var(--bg-primary)] rounded-lg shadow-sm border border-[var(--border-secondary)] p-6">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{t('priorityDistribution')}</h3>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">{t('priorityDistributionDesc')}</p>
          <BarChart
            rows={priorityDist}
            total={totalCards}
            t={t as (key: string) => string}
          />
        </section>

        {/* Section 3: Member Workload */}
        <section className="bg-[var(--bg-primary)] rounded-lg shadow-sm border border-[var(--border-secondary)] p-6">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{t('memberWorkload')}</h3>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">
            {t('memberWorkloadDesc', { count: totalWithAssignees })}
          </p>
          {memberWorkload.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)] italic">{t('noMemberAssigned')}</p>
          ) : (
            <BarChart
              rows={memberWorkload.map((m) => ({ label: m.name, count: m.count }))}
              total={totalWithAssignees}
              colorClass="bg-purple-500"
              t={t as (key: string) => string}
            />
          )}
        </section>

        {/* Date Range Picker */}
        <section className="bg-[var(--bg-primary)] rounded-lg shadow-sm border border-[var(--border-secondary)] p-6">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{t('analyticsDateRange')}</h3>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">
            {t('analyticsDateRangeDesc')}
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1">{t('from')}</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-1.5 border border-[var(--border-secondary)] rounded-md text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1">{t('to')}</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-1.5 border border-[var(--border-secondary)] rounded-md text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div className="flex gap-2 items-end pb-0.5">
              {(['7d', '30d', '90d'] as const).map((range) => {
                const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
                return (
                  <button
                    key={range}
                    onClick={() => {
                      const to = new Date();
                      const from = new Date();
                      from.setDate(from.getDate() - days);
                      setFromDate(from.toISOString().slice(0, 10));
                      setToDate(to.toISOString().slice(0, 10));
                    }}
                    className="px-3 py-1.5 text-xs rounded border border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  >
                    {t('last', { range })}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 4: Cumulative Flow Diagram */}
        <section className="bg-[var(--bg-primary)] rounded-lg shadow-sm border border-[var(--border-secondary)] p-6">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{t('cfd')}</h3>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">
            {t('cfdDesc', { from: fromDate, to: toDate })}
          </p>
          {cfdLoading ? (
            <p className="text-sm text-[var(--text-tertiary)]">{t('cfdLoading')}</p>
          ) : (
            <CFDChart data={cfdData as CFDDataPoint[]} t={t} />
          )}
        </section>

        {/* Section 5: Lead Time Distribution */}
        <section className="bg-[var(--bg-primary)] rounded-lg shadow-sm border border-[var(--border-secondary)] p-6">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{t('leadTime')}</h3>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">
            {t('leadTimeDesc', { from: fromDate, to: toDate })}
          </p>
          {leadTimeLoading ? (
            <p className="text-sm text-[var(--text-tertiary)]">{t('leadTimeLoading')}</p>
          ) : (
            <LeadTimeChart data={leadTimeData as LeadTimeEntry[]} t={t} />
          )}
        </section>

        {/* Section 6: Throughput Chart */}
        <section className="bg-[var(--bg-primary)] rounded-lg shadow-sm border border-[var(--border-secondary)] p-6">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{t('throughput')}</h3>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">
            {t('throughputDesc', { from: fromDate, to: toDate })}
          </p>
          {throughputLoading ? (
            <p className="text-sm text-[var(--text-tertiary)]">{t('throughputLoading')}</p>
          ) : (
            <ThroughputChart data={throughputData as ThroughputEntry[]} t={t} />
          )}
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
    <div className="bg-[var(--bg-primary)] rounded-lg shadow-sm border border-[var(--border-secondary)] p-4 text-center">
      <div className={`text-3xl font-bold ${accent ?? 'text-[var(--text-primary)]'}`}>{value}</div>
      <div className="text-xs text-[var(--text-tertiary)] mt-1">{label}</div>
    </div>
  );
}
