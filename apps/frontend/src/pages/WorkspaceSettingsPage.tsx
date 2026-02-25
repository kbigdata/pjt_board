import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { workspacesApi } from '@/api/workspaces';
import { usersApi, type UserSearchResult } from '@/api/users';
import { useAuthStore } from '@/stores/auth';

type Tab = 'general' | 'members';

const ROLE_OPTIONS = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;
type Role = (typeof ROLE_OPTIONS)[number];

const ROLE_BADGE: Record<Role, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-gray-100 text-gray-700',
  VIEWER: 'bg-green-100 text-green-700',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function WorkspaceSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const { t } = useTranslation('settings');
  const { t: tb } = useTranslation('board');
  const { t: tc } = useTranslation('common');

  const [activeTab, setActiveTab] = useState<Tab>('general');

  const { data: workspace, isLoading } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => workspacesApi.getById(workspaceId!),
    enabled: !!workspaceId,
  });

  const myRole = workspace?.members.find((m) => m.user.id === currentUser?.id)?.role as Role | undefined;
  const isOwner = myRole === 'OWNER';
  const isOwnerOrAdmin = myRole === 'OWNER' || myRole === 'ADMIN';

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-[var(--text-secondary)]">{tc('loading')}</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-red-500">{t('workspaceNotFound')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to={`/workspaces/${workspaceId}`} className="text-sm text-blue-600 hover:underline">
          &larr; {workspace.name}
        </Link>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-2">{t('workspace.title')}</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border-primary)] mb-6">
        <nav className="flex gap-0">
          {(['general', 'members'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab === 'general' ? t('workspace.tabGeneral') : t('workspace.tabMembers')}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'general' && (
        <GeneralTab
          workspaceId={workspaceId!}
          workspace={workspace}
          isOwnerOrAdmin={isOwnerOrAdmin}
          isOwner={isOwner}
          onDeleted={() => navigate('/')}
          queryClient={queryClient}
        />
      )}

      {activeTab === 'members' && (
        <MembersTab
          workspaceId={workspaceId!}
          workspace={workspace}
          myRole={myRole}
          currentUserId={currentUser?.id}
          isOwner={isOwner}
          isOwnerOrAdmin={isOwnerOrAdmin}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

// ─── General Tab ─────────────────────────────────────────────

function GeneralTab({
  workspaceId,
  workspace,
  isOwnerOrAdmin,
  isOwner,
  onDeleted,
  queryClient,
}: {
  workspaceId: string;
  workspace: { name: string; description: string | null };
  isOwnerOrAdmin: boolean;
  isOwner: boolean;
  onDeleted: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const { t } = useTranslation('settings');
  const { t: tc } = useTranslation('common');
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? '');

  useEffect(() => {
    setName(workspace.name);
    setDescription(workspace.description ?? '');
  }, [workspace.name, workspace.description]);

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      workspacesApi.update(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => workspacesApi.delete(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      onDeleted();
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ name: name.trim(), description: description.trim() });
  };

  const handleDelete = () => {
    if (window.confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSave} className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-primary)] p-6 space-y-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{t('workspace.generalInfo')}</h3>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            {t('workspace.nameLabel')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            readOnly={!isOwnerOrAdmin}
            required
            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--bg-primary)] text-[var(--text-primary)] ${
              isOwnerOrAdmin
                ? 'border-[var(--border-secondary)]'
                : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] cursor-not-allowed'
            }`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            {t('workspace.descriptionLabel')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            readOnly={!isOwnerOrAdmin}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-[var(--bg-primary)] text-[var(--text-primary)] ${
              isOwnerOrAdmin
                ? 'border-[var(--border-secondary)]'
                : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] cursor-not-allowed'
            }`}
          />
        </div>

        {isOwnerOrAdmin && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {updateMutation.isPending ? tc('loading') : t('workspace.saveChanges')}
            </button>
          </div>
        )}
      </form>

      {isOwner && (
        <div className="bg-[var(--bg-primary)] rounded-lg border border-red-200 p-6">
          <h3 className="text-base font-semibold text-red-700 mb-1">{t('danger')}</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {t('workspace.dangerDescription')}
          </p>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
          >
            {deleteMutation.isPending ? tc('loading') : t('workspace.deleteWorkspace')}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Members Tab ─────────────────────────────────────────────

function MembersTab({
  workspaceId,
  workspace,
  myRole,
  currentUserId,
  isOwner,
  isOwnerOrAdmin,
  queryClient,
}: {
  workspaceId: string;
  workspace: { members: Array<{ id: string; userId: string; role: string; joinedAt: string; user: { id: string; email: string; name: string; avatarUrl: string | null } }> };
  myRole: Role | undefined;
  currentUserId: string | undefined;
  isOwner: boolean;
  isOwnerOrAdmin: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const { t } = useTranslation('settings');
  const { t: tc } = useTranslation('common');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [newMemberRole, setNewMemberRole] = useState<Role>('MEMBER');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const memberUserIds = new Set(workspace.members.map((m) => m.user.id));

  // Debounced user search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await usersApi.search(searchQuery);
        setSearchResults(results);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const addMemberMutation = useMutation({
    mutationFn: () => workspacesApi.addMember(workspaceId, selectedUser!.id, newMemberRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      setSelectedUser(null);
      setSearchQuery('');
      setNewMemberRole('MEMBER');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      workspacesApi.updateMemberRole(workspaceId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => workspacesApi.removeMember(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    },
  });

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUser(user);
    setSearchQuery(user.email);
    setShowDropdown(false);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    addMemberMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Add member form */}
      {isOwnerOrAdmin && (
        <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-primary)] p-6">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">{t('workspace.addMember')}</h3>
          <form onSubmit={handleAddMember} className="flex gap-2 items-end flex-wrap">
            {/* Search input with dropdown */}
            <div className="relative flex-1 min-w-48" ref={dropdownRef}>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                {t('workspace.searchByEmailOrName')}
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedUser(null);
                }}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-[var(--border-secondary)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showDropdown && searchResults.length > 0 && (
                <div className="dropdown-menu absolute z-10 mt-1 w-full max-h-48 overflow-y-auto">
                  {searchResults.map((user) => {
                    const alreadyMember = memberUserIds.has(user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        disabled={alreadyMember}
                        onClick={() => handleSelectUser(user)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                          alreadyMember
                            ? 'opacity-50 cursor-not-allowed bg-[var(--bg-secondary)]'
                            : 'hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center shrink-0">
                          {getInitials(user.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-[var(--text-primary)] truncate">{user.name}</div>
                          <div className="text-[var(--text-secondary)] truncate">{user.email}</div>
                        </div>
                        {alreadyMember && (
                          <span className="ml-auto text-xs text-[var(--text-tertiary)] shrink-0">{t('workspace.alreadyMember')}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {showDropdown && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div className="dropdown-menu absolute z-10 mt-1 w-full px-3 py-2 text-sm text-[var(--text-secondary)]">
                  {tc('noResults')}
                </div>
              )}
            </div>

            {/* Role select */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">{t('workspace.roleLabel')}</label>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as Role)}
                className="px-3 py-2 border border-[var(--border-secondary)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MEMBER">{t('workspace.roleMember')}</option>
                <option value="ADMIN">{t('workspace.roleAdmin')}</option>
                <option value="VIEWER">{t('workspace.roleViewer')}</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!selectedUser || addMemberMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {addMemberMutation.isPending ? tc('loading') : t('workspace.addMember')}
            </button>
          </form>
        </div>
      )}

      {/* Members list */}
      <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-primary)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-primary)]">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {t('workspace.membersTitle')} ({workspace.members.length})
          </h3>
        </div>
        <div className="divide-y divide-[var(--border-primary)]">
          {workspace.members.map((member) => {
            const isOwnerRow = member.role === 'OWNER';
            const isCurrentUser = member.user.id === currentUserId;
            return (
              <div key={member.id} className="px-6 py-4 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 text-sm font-medium flex items-center justify-center shrink-0">
                  {getInitials(member.user.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)] text-sm truncate">
                      {member.user.name}
                    </span>
                    {isCurrentUser && (
                      <span className="text-xs text-[var(--text-tertiary)]">({t('workspace.you')})</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] truncate">{member.user.email}</div>
                </div>

                {/* Joined date */}
                <div className="text-xs text-[var(--text-tertiary)] hidden sm:block shrink-0">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </div>

                {/* Role badge / select */}
                {isOwner && !isOwnerRow ? (
                  <select
                    value={member.role}
                    onChange={(e) =>
                      updateRoleMutation.mutate({ userId: member.userId, role: e.target.value })
                    }
                    disabled={updateRoleMutation.isPending}
                    className="text-xs px-2 py-1 border border-[var(--border-secondary)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      ROLE_BADGE[member.role as Role] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {member.role}
                  </span>
                )}

                {/* Remove button */}
                {isOwnerOrAdmin && !isOwnerRow && !isCurrentUser && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Remove ${member.user.name} from this workspace?`)) {
                        removeMemberMutation.mutate(member.userId);
                      }
                    }}
                    disabled={removeMemberMutation.isPending}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 shrink-0"
                    title={tc('remove')}
                  >
                    {tc('remove')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
