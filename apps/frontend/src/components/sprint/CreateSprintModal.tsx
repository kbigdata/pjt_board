import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CreateSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; goal?: string; startDate: string; endDate: string }) => void;
}

export default function CreateSprintModal({ isOpen, onClose, onCreate }: CreateSprintModalProps) {
  const { t } = useTranslation('sprint');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;
    onCreate({
      name: name.trim(),
      goal: goal.trim() || undefined,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
    });
    setName('');
    setGoal('');
    setStartDate('');
    setEndDate('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--bg-primary)] rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{t('createSprint')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('sprintName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('sprintNamePlaceholder')}
              className="w-full px-3 py-2 rounded border border-[var(--border-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('sprintGoal')}</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={t('sprintGoalPlaceholder')}
              className="w-full px-3 py-2 rounded border border-[var(--border-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] resize-none"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('startDate')}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded border border-[var(--border-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('endDate')}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded border border-[var(--border-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded border border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              {t('cancel', { ns: 'common' })}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !startDate || !endDate}
              className="px-4 py-2 text-sm rounded bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {t('createSprint')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
