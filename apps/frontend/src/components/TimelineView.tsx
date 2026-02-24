import { useState, useMemo, useRef } from 'react';
import { type Card } from '@/api/boards';

const PRIORITY_BAR_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-500 hover:bg-red-600',
  HIGH: 'bg-orange-400 hover:bg-orange-500',
  MEDIUM: 'bg-blue-400 hover:bg-blue-500',
  LOW: 'bg-gray-400 hover:bg-gray-500',
};

const PRIORITY_BORDER_COLORS: Record<string, string> = {
  CRITICAL: 'border-red-600',
  HIGH: 'border-orange-500',
  MEDIUM: 'border-blue-500',
  LOW: 'border-gray-500',
};

type ZoomLevel = 'week' | 'month';

interface TimelineViewProps {
  cards: Card[];
  onCardClick: (cardId: string) => void;
}

interface ScheduledCard {
  card: Card;
  startDate: Date;
  endDate: Date;
  isSingleDay: boolean;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

const DAY_WIDTH_WEEK = 64; // px per day in week zoom
const DAY_WIDTH_MONTH = 32; // px per day in month zoom
const ROW_HEIGHT = 40; // px per card row
const LEFT_PANEL_WIDTH = 200; // px for card title column

export default function TimelineView({ cards, onCardClick }: TimelineViewProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const scrollRef = useRef<HTMLDivElement>(null);

  const dayWidth = zoom === 'week' ? DAY_WIDTH_WEEK : DAY_WIDTH_MONTH;

  // Separate scheduled and unscheduled cards
  const { scheduled, unscheduled } = useMemo(() => {
    const scheduled: ScheduledCard[] = [];
    const unscheduled: Card[] = [];

    for (const card of cards) {
      if (!card.dueDate && !card.startDate) {
        unscheduled.push(card);
        continue;
      }
      if (card.dueDate) {
        const end = startOfDay(new Date(card.dueDate));
        const start = card.startDate ? startOfDay(new Date(card.startDate)) : end;
        const isSingleDay = !card.startDate || diffDays(start, end) === 0;
        scheduled.push({ card, startDate: start, endDate: end, isSingleDay });
      } else {
        unscheduled.push(card);
      }
    }

    // Sort by start date
    scheduled.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    return { scheduled, unscheduled };
  }, [cards]);

  // Determine timeline range
  const { timelineStart, totalDays } = useMemo(() => {
    if (scheduled.length === 0) {
      const today = startOfDay(new Date());
      return { timelineStart: addDays(today, -7), totalDays: zoom === 'week' ? 14 : 60 };
    }

    const minDate = scheduled.reduce(
      (min, sc) => (sc.startDate < min ? sc.startDate : min),
      scheduled[0].startDate,
    );
    const maxDate = scheduled.reduce(
      (max, sc) => (sc.endDate > max ? sc.endDate : max),
      scheduled[0].endDate,
    );

    // Add padding
    const start = addDays(minDate, -3);
    const end = addDays(maxDate, 3);
    const days = Math.max(diffDays(start, end), zoom === 'week' ? 14 : 60);

    return { timelineStart: start, totalDays: days };
  }, [scheduled, zoom]);

  const totalWidth = totalDays * dayWidth;

  // Today position
  const today = startOfDay(new Date());
  const todayOffset = diffDays(timelineStart, today);
  const todayX = todayOffset * dayWidth;

  // Build column headers (day labels)
  const columnHeaders = useMemo(() => {
    const headers: Array<{ label: string; x: number; isToday: boolean }> = [];
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(timelineStart, i);
      const isToday = diffDays(today, date) === 0;

      let label: string;
      if (zoom === 'week') {
        // Show day abbreviation + date for week zoom
        label = date.getDate().toString();
      } else {
        // For month zoom, show date number, but month label at month boundaries
        label = date.getDate() === 1
          ? date.toLocaleDateString('en-US', { month: 'short' })
          : date.getDate().toString();
      }
      headers.push({ label, x: i * dayWidth, isToday });
    }
    return headers;
  }, [timelineStart, totalDays, dayWidth, zoom, today]);

  // Build week/month separator markers
  const separators = useMemo(() => {
    const seps: Array<{ x: number; label: string }> = [];
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(timelineStart, i);
      if (zoom === 'week' && date.getDay() === 0 && i > 0) {
        seps.push({
          x: i * dayWidth,
          label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        });
      } else if (zoom === 'month' && date.getDate() === 1 && i > 0) {
        seps.push({
          x: i * dayWidth,
          label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        });
      }
    }
    return seps;
  }, [timelineStart, totalDays, dayWidth, zoom]);

  const HEADER_HEIGHT = 56;

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center rounded border border-gray-300 overflow-hidden">
          <button
            onClick={() => setZoom('week')}
            className={`text-sm px-3 py-1 ${zoom === 'week' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Week
          </button>
          <button
            onClick={() => setZoom('month')}
            className={`text-sm px-3 py-1 border-l border-gray-300 ${zoom === 'month' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Month
          </button>
        </div>
        <span className="text-sm text-gray-500">
          {scheduled.length} scheduled, {unscheduled.length} unscheduled
        </span>
        <button
          onClick={() => {
            if (scrollRef.current) {
              const scrollX = Math.max(0, todayX - 100);
              scrollRef.current.scrollLeft = scrollX;
            }
          }}
          className="text-sm px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          Jump to today
        </button>
      </div>

      {scheduled.length === 0 && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          No cards have start or due dates. Add dates to cards to see them in the timeline.
        </div>
      )}

      {/* Timeline */}
      <div className="flex flex-1 overflow-hidden border border-gray-200 rounded-lg">
        {/* Left panel: card titles */}
        <div className="flex-shrink-0 bg-white border-r border-gray-200 z-10" style={{ width: LEFT_PANEL_WIDTH }}>
          {/* Header spacer */}
          <div className="border-b border-gray-200" style={{ height: HEADER_HEIGHT }}>
            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">Cards</div>
          </div>
          {/* Card rows */}
          {scheduled.map((sc) => (
            <div
              key={sc.card.id}
              className="flex items-center px-3 border-b border-gray-100"
              style={{ height: ROW_HEIGHT }}
            >
              <button
                onClick={() => onCardClick(sc.card.id)}
                className="text-sm text-gray-700 hover:text-blue-600 truncate text-left w-full"
                title={sc.card.title}
              >
                {sc.card.title}
              </button>
            </div>
          ))}
        </div>

        {/* Right panel: scrollable timeline */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
          <div style={{ width: totalWidth, minWidth: '100%' }}>
            {/* Time axis header */}
            <div
              className="relative border-b border-gray-200 bg-gray-50"
              style={{ height: HEADER_HEIGHT }}
            >
              {/* Month/week labels at separators */}
              {separators.map((sep, i) => (
                <div
                  key={i}
                  className="absolute top-0 flex flex-col items-start"
                  style={{ left: sep.x }}
                >
                  <div className="w-px h-full bg-gray-300" />
                  <span className="absolute top-1 left-1 text-xs text-gray-500 font-medium whitespace-nowrap">
                    {sep.label}
                  </span>
                </div>
              ))}
              {/* Day number labels */}
              {columnHeaders.map((col, i) => (
                <div
                  key={i}
                  className="absolute bottom-0 flex items-center justify-center"
                  style={{ left: col.x, width: dayWidth }}
                >
                  <span
                    className={`text-xs ${col.isToday ? 'text-blue-600 font-bold' : 'text-gray-400'}`}
                  >
                    {col.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Card bars area */}
            <div className="relative" style={{ height: scheduled.length * ROW_HEIGHT }}>
              {/* Today line */}
              {todayX >= 0 && todayX <= totalWidth && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                  style={{ left: todayX }}
                />
              )}

              {/* Alternate row background */}
              {scheduled.map((sc, rowIdx) => (
                <div
                  key={sc.card.id + '-bg'}
                  className={`absolute left-0 right-0 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  style={{ top: rowIdx * ROW_HEIGHT, height: ROW_HEIGHT }}
                />
              ))}

              {/* Vertical grid lines at separators */}
              {separators.map((sep, i) => (
                <div
                  key={'grid-' + i}
                  className="absolute top-0 bottom-0 w-px bg-gray-200"
                  style={{ left: sep.x }}
                />
              ))}

              {/* Card bars */}
              {scheduled.map((sc, rowIdx) => {
                const offsetDays = diffDays(timelineStart, sc.startDate);
                const durationDays = Math.max(1, diffDays(sc.startDate, sc.endDate) + 1);
                const barX = offsetDays * dayWidth;
                const barWidth = sc.isSingleDay ? dayWidth * 0.8 : durationDays * dayWidth - 2;
                const barTop = rowIdx * ROW_HEIGHT + 8;
                const barHeight = ROW_HEIGHT - 16;

                const colorClass =
                  PRIORITY_BAR_COLORS[sc.card.priority] ?? 'bg-gray-400 hover:bg-gray-500';
                const borderClass =
                  PRIORITY_BORDER_COLORS[sc.card.priority] ?? 'border-gray-500';

                return (
                  <button
                    key={sc.card.id}
                    onClick={() => onCardClick(sc.card.id)}
                    className={`absolute rounded transition-colors ${colorClass} ${sc.isSingleDay ? `border-2 ${borderClass}` : ''} text-white text-xs flex items-center px-1.5 overflow-hidden`}
                    style={{
                      left: barX,
                      top: barTop,
                      width: Math.max(barWidth, 8),
                      height: barHeight,
                    }}
                    title={`${sc.card.title} (${sc.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sc.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
                  >
                    {!sc.isSingleDay && barWidth > 30 && (
                      <span className="truncate leading-tight">{sc.card.title}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Unscheduled section */}
      {unscheduled.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
            Unscheduled ({unscheduled.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((card) => (
              <button
                key={card.id}
                onClick={() => onCardClick(card.id)}
                className="text-sm px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
              >
                {card.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
