import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { workspacesApi } from '@/api/workspaces';

export default function WorkspacesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { t } = useTranslation('board');
  const { t: tc } = useTranslation('common');

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspacesApi.list,
  });

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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-[var(--text-secondary)]">{tc('loading')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">{t('workspace.myWorkspaces')}</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          {t('workspace.newWorkspace')}
        </button>
      </div>

      {showCreate && (
        <div className="bg-[var(--bg-primary)] rounded-lg shadow-sm border border-[var(--border-primary)] p-4 mb-6">
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('workspace.namePlaceholder')}
              className="w-full px-3 py-2 border border-[var(--border-secondary)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('workspace.descriptionPlaceholder')}
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
          <p>{t('workspace.empty')}</p>
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
                <span>{ws.memberCount ?? 0} {t('members')}</span>
                <span className="uppercase">{ws.myRole}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
