import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';

const DEFAULT_SETTINGS = [
  { key: 'MAX_FILE_UPLOAD_SIZE_MB', label: 'Max File Upload Size (MB)', defaultValue: '10' },
  { key: 'ALLOW_USER_REGISTRATION', label: 'Allow User Registration', defaultValue: 'true' },
  { key: 'MAX_WORKSPACES_PER_USER', label: 'Max Workspaces Per User', defaultValue: '10' },
  { key: 'MAX_BOARDS_PER_WORKSPACE', label: 'Max Boards Per Workspace', defaultValue: '50' },
];

export default function AdminSettingsPage() {
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
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">System Settings</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-xl">
        <div className="space-y-4">
          {DEFAULT_SETTINGS.map((def) => (
            <div key={def.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{def.label}</label>
              {def.key === 'ALLOW_USER_REGISTRATION' ? (
                <select
                  value={formValues[def.key] ?? def.defaultValue}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, [def.key]: e.target.value }))
                  }
                  className="border rounded-md px-3 py-2 text-sm w-full"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={formValues[def.key] ?? def.defaultValue}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, [def.key]: e.target.value }))
                  }
                  className="border rounded-md px-3 py-2 text-sm w-full"
                />
              )}
              <div className="text-xs text-gray-400 mt-1">Key: {def.key}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="text-sm text-green-600">Settings saved!</span>}
        </div>
      </form>
    </div>
  );
}
