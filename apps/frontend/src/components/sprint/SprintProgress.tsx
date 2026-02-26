import { useTranslation } from 'react-i18next';
import { type SprintProgress as SprintProgressType } from '@/api/sprints';

interface SprintProgressProps {
  progress: SprintProgressType;
  daysRemaining: number;
  compact?: boolean;
}

export default function SprintProgress({ progress, daysRemaining, compact }: SprintProgressProps) {
  const { t } = useTranslation('sprint');
  const { total, done, inProgress, todo, percentComplete: _percentComplete } = progress;

  // Build segment widths
  const doneWidth = total > 0 ? (done / total) * 100 : 0;
  const inProgressWidth = total > 0 ? (inProgress / total) * 100 : 0;

  return (
    <div className={compact ? 'w-full' : 'w-full space-y-1'}>
      {!compact && (
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>{t('cardsCompleted', { done, total })}</span>
          <span className={daysRemaining < 0 ? 'text-[var(--error)]' : ''}>
            {daysRemaining < 0
              ? t('daysOverdue', { count: Math.abs(daysRemaining) })
              : t('daysRemaining', { count: daysRemaining })}
          </span>
        </div>
      )}
      <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden flex">
        {doneWidth > 0 && (
          <div
            className="h-full bg-[var(--success)] transition-all"
            style={{ width: `${doneWidth}%` }}
            title={`${t('done')}: ${done}`}
          />
        )}
        {inProgressWidth > 0 && (
          <div
            className="h-full bg-[var(--accent)] transition-all"
            style={{ width: `${inProgressWidth}%` }}
            title={`${t('inProgress')}: ${inProgress}`}
          />
        )}
      </div>
      {!compact && (
        <div className="flex gap-3 text-xs text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--success)]" /> {t('done')} {done}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" /> {t('inProgress')} {inProgress}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--bg-tertiary)]" /> {t('todo')} {todo}
          </span>
        </div>
      )}
    </div>
  );
}
