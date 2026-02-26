import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';

type SettingDef = {
  key: string;
  labelKey: string;
  defaultValue: string;
};

const DEFAULT_SETTINGS: SettingDef[] = [
  { key: 'MAX_FILE_UPLOAD_SIZE_MB', labelKey: 'settings.maxFileUpload', defaultValue: '10' },
  { key: 'ALLOW_USER_REGISTRATION', labelKey: 'settings.allowRegistration', defaultValue: 'true' },
  { key: 'MAX_WORKSPACES_PER_USER', labelKey: 'settings.maxWorkspacesPerUser', defaultValue: '10' },
  { key: 'MAX_BOARDS_PER_WORKSPACE', labelKey: 'settings.maxBoardsPerWorkspace', defaultValue: '50' },
];

export default function AdminSettingsPage() {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminApi.getSettings(),
  });

  useEffect(() => {
    if (settings) {
      const values: Record<string, string> = {};
      for (const def of DEFAULT_SETTINGS) {
        const existing = settings.find((s) => s.key === def.key);
        values[def.key] = existing?.value ?? def.defaultValue;
      }
      setFormValues(values);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: { settings: { key: string; value: string }[] }) =>
      adminApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const settingsArr = Object.entries(formValues).map(([key, value]) => ({ key, value }));
    updateMutation.mutate({ settings: settingsArr });
  };

  if (isLoading) {
    return <div className="text-[var(--text-tertiary)]">{t('settings.loading')}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">{t('settings.title')}</h1>

      <form onSubmit={handleSubmit} className="bg-[var(--bg-primary)] rounded-lg shadow p-6 max-w-xl">
        <div className="space-y-4">
          {DEFAULT_SETTINGS.map((def) => (
            <div key={def.key}>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                {t(def.labelKey)}
              </label>
              {def.key === 'ALLOW_USER_REGISTRATION' ? (
                <select
                  value={formValues[def.key] ?? def.defaultValue}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, [def.key]: e.target.value }))
                  }
                  className="border border-[var(--border-secondary)] rounded-md px-3 py-2 text-sm w-full bg-[var(--bg-primary)] text-[var(--text-primary)]"
                >
                  <option value="true">{t('settings.yes')}</option>
                  <option value="false">{t('settings.no')}</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={formValues[def.key] ?? def.defaultValue}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, [def.key]: e.target.value }))
                  }
                  className="border border-[var(--border-secondary)] rounded-md px-3 py-2 text-sm w-full bg-[var(--bg-primary)] text-[var(--text-primary)]"
                />
              )}
              <div className="text-xs text-[var(--text-tertiary)] mt-1">
                {t('settings.key', { key: def.key })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-[var(--accent)] text-white px-4 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-50"
          >
            {updateMutation.isPending ? t('settings.saving') : t('settings.saveSettings')}
          </button>
          {saved && <span className="text-sm text-green-600">{t('settings.saved')}</span>}
        </div>
      </form>
    </div>
  );
}
