import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { type Sprint, sprintsApi } from '@/api/sprints';
import SprintProgress from './SprintProgress';

interface SprintSelectorProps {
  boardId: string;
  activeSprint: Sprint | null;
  sprints: Sprint[];
  onCreateClick: () => void;
  onStartSprint: (id: string) => void;
  onCompleteSprint: (id: string) => void;
  onCancelSprint: (id: string) => void;
  onSelectSprint: (sprint: Sprint) => void;
}

export default function SprintSelector({
  boardId: _boardId,
  activeSprint,
  sprints,
  onCreateClick,
  onStartSprint,
  onCompleteSprint,
  onCancelSprint,
  onSelectSprint,
}: SprintSelectorProps) {
  const { t } = useTranslation('sprint');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch progress for active sprint
  const { data: progress } = useQuery({
    queryKey: ['sprints', activeSprint?.id, 'progress'],
    queryFn: () => sprintsApi.getProgress(activeSprint!.id),
    enabled: !!activeSprint,
    refetchInterval: 30000,
  });

  const daysRemaining = activeSprint
    ? Math.ceil((new Date(activeSprint.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
      {/* Sprint info */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--border-secondary)] hover:bg-[var(--bg-hover)] text-sm"
        >
          <span className="font-medium text-[var(--text-primary)]">
            {activeSprint ? activeSprint.name : t('noActiveSprint')}
          </span>
          {activeSprint && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {new Date(activeSprint.startDate).toLocaleDateString()} -{' '}
              {new Date(activeSprint.endDate).toLocaleDateString()}
            </span>
          )}
          <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg shadow-lg z-50">
            <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
              {sprints.map((sprint) => (
                <button
                  key={sprint.id}
                  onClick={() => {
                    onSelectSprint(sprint);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-[var(--bg-hover)] ${
                    activeSprint?.id === sprint.id ? 'bg-[var(--accent-light)]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--text-primary)]">{sprint.name}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        sprint.status === 'ACTIVE'
                          ? 'bg-[var(--success-light)] text-[var(--success)]'
                          : sprint.status === 'PLANNING'
                            ? 'bg-[var(--warning-light)] text-[var(--warning)]'
                            : sprint.status === 'COMPLETED'
                              ? 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                              : 'bg-[var(--error-light)] text-[var(--error)]'
                      }`}
                    >
                      {t(sprint.status.toLowerCase())}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {new Date(sprint.startDate).toLocaleDateString()} -{' '}
                    {new Date(sprint.endDate).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-[var(--border-primary)] p-2">
              <button
                onClick={() => {
                  onCreateClick();
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded text-sm text-[var(--accent)] hover:bg-[var(--accent-light)]"
              >
                + {t('createSprint')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar for active sprint */}
      {activeSprint && progress && (
        <div className="flex-1 max-w-xs">
          <SprintProgress progress={progress} daysRemaining={daysRemaining} compact />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 ml-auto">
        {activeSprint?.status === 'ACTIVE' && (
          <>
            <button
              onClick={() => {
                if (confirm(t('confirmComplete'))) onCompleteSprint(activeSprint.id);
              }}
              className="text-xs px-3 py-1.5 rounded bg-[var(--success)] text-white hover:opacity-90"
            >
              {t('complete')}
            </button>
            <button
              onClick={() => {
                if (confirm(t('confirmCancel'))) onCancelSprint(activeSprint.id);
              }}
              className="text-xs px-3 py-1.5 rounded border border-[var(--error)] text-[var(--error)] hover:bg-[var(--error-light)]"
            >
              {t('cancel')}
            </button>
          </>
        )}
        {sprints.some((s) => s.status === 'PLANNING') && !activeSprint && (
          <button
            onClick={() => {
              const planning = sprints.find((s) => s.status === 'PLANNING');
              if (planning && confirm(t('confirmStart'))) onStartSprint(planning.id);
            }}
            className="text-xs px-3 py-1.5 rounded bg-[var(--accent)] text-white hover:opacity-90"
          >
            {t('start')}
          </button>
        )}
        <button
          onClick={onCreateClick}
          className="text-xs px-3 py-1.5 rounded border border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          + {t('createSprint')}
        </button>
      </div>
    </div>
  );
}
