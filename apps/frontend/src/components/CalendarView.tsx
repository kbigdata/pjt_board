import { useState, useMemo } from 'react';
import { type Card } from '@/api/boards';

const PRIORITY_DOT_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-400',
  MEDIUM: 'bg-blue-400',
  LOW: 'bg-gray-400',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface CalendarViewProps {
  cards: Card[];
  onCardClick: (cardId: string) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  cards: Card[];
}

function buildCalendarDays(year: number, month: number, cards: Card[]): CalendarDay[][] {
  // Build a map from date string (YYYY-MM-DD) to cards
  const cardsByDate = new Map<string, Card[]>();
  for (const card of cards) {
    if (!card.dueDate) continue;
    const due = new Date(card.dueDate);
    const key = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
    const existing = cardsByDate.get(key) ?? [];
    existing.push(card);
    cardsByDate.set(key, existing);
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // First day of the current month
  const firstOfMonth = new Date(year, month, 1);
  // Last day of the current month
  const lastOfMonth = new Date(year, month + 1, 0);

  // Start from the Sunday before or on the first of the month
  const startDate = new Date(firstOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // End at the Saturday after or on the last of the month
  const endDate = new Date(lastOfMonth);
  if (endDate.getDay() !== 6) {
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
  }

  const weeks: CalendarDay[][] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const week: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      week.push({
        date: new Date(cursor),
        isCurrentMonth: cursor.getMonth() === month,
        isToday: dateKey === todayKey,
        cards: cardsByDate.get(dateKey) ?? [],
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

export default function CalendarView({ cards, onCardClick }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const weeks = useMemo(() => buildCalendarDays(year, month, cards), [year, month, cards]);

  const hasAnyDueDates = cards.some((c) => c.dueDate !== null);

  const handlePrevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-800 w-44 text-center">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
            aria-label="Next month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={handleToday}
          className="text-sm px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          Today
        </button>
      </div>

      {!hasAnyDueDates && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          No cards have due dates set. Add due dates to cards to see them in the calendar.
        </div>
      )}

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAY_NAMES.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid auto-rows-fr" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(100px, 1fr))` }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => (
              <div
                key={di}
                className={`border-b border-r border-gray-200 p-1.5 min-h-24 ${
                  di === 0 ? 'border-l border-gray-200' : ''
                } ${!day.isCurrentMonth ? 'bg-gray-50' : 'bg-white'}`}
              >
                {/* Day number */}
                <div className="flex items-center justify-end mb-1">
                  <span
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      day.isToday
                        ? 'bg-blue-600 text-white'
                        : day.isCurrentMonth
                        ? 'text-gray-700'
                        : 'text-gray-400'
                    }`}
                  >
                    {day.date.getDate()}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-0.5">
                  {day.cards.slice(0, 3).map((card) => (
                    <button
                      key={card.id}
                      onClick={() => onCardClick(card.id)}
                      className="w-full text-left group"
                      title={card.title}
                    >
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors">
                        <span
                          className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${
                            PRIORITY_DOT_COLORS[card.priority] ?? 'bg-gray-400'
                          }`}
                        />
                        <span className="text-xs text-gray-700 truncate leading-tight">
                          {card.title}
                        </span>
                      </div>
                    </button>
                  ))}
                  {day.cards.length > 3 && (
                    <div className="text-xs text-gray-400 px-1.5">
                      +{day.cards.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
