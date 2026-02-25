import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, Plus, ChevronsLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { workspacesApi, type Workspace } from '@/api/workspaces';
import { boardsApi, type Board } from '@/api/boards';
import { usePresenceStore } from '@/stores/presence';
import { useUIStore } from '@/stores/ui';

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function SidebarSection({ title, children, defaultOpen = true }: SidebarSectionProps) {
  const [collapsed, setCollapsed] = useState(!defaultOpen);

  return (
    <div className="mb-2">
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="w-full flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#ababad] uppercase tracking-wider hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        {title}
      </button>
      {!collapsed && <div>{children}</div>}
    </div>
  );
}

interface RecentBoard {
  id: string;
  title: string;
}

function getRecentBoards(): RecentBoard[] {
  try {
    return JSON.parse(localStorage.getItem('kanflow:recent-boards') || '[]');
  } catch {
    return [];
  }
}

export default function BoardSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { onlineUsers } = usePresenceStore();
  const { toggleSidebar } = useUIStore();
  const { t } = useTranslation('board');

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: () => workspacesApi.list(),
  });

  // Auto-select first workspace
  const effectiveWorkspaceId = selectedWorkspaceId ?? workspaces[0]?.id ?? null;

  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ['boards', effectiveWorkspaceId],
    queryFn: () => boardsApi.list(effectiveWorkspaceId!),
    enabled: !!effectiveWorkspaceId,
  });

  const recentBoards = getRecentBoards();

  // Count total online users across all boards
  const totalOnlineUsers = Object.values(onlineUsers).flat();
  const uniqueOnlineCount = new Set(totalOnlineUsers).size;

  const currentBoardId = location.pathname.match(/\/boards\/([^/]+)/)?.[1] ?? null;

  return (
    <div className="bg-[var(--sidebar-bg,#1a1d21)] text-[var(--sidebar-text,#d1d2d3)] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
        <span className="text-sm font-bold text-white truncate">KanFlow</span>
        <button
          onClick={toggleSidebar}
          className="text-[#ababad] hover:text-white transition-colors p-0.5 rounded"
          title="Close sidebar (B)"
        >
          <ChevronsLeft size={16} />
        </button>
      </div>

      {/* Workspace switcher */}
      {workspaces.length > 1 && (
        <div className="px-3 py-2 border-b border-white/10">
          <select
            value={effectiveWorkspaceId ?? ''}
            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
            className="w-full bg-white/10 text-white text-xs rounded px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id} className="bg-gray-800">
                {ws.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {workspaces.length === 1 && (
        <div className="px-3 py-2 border-b border-white/10">
          <span className="text-xs text-[#ababad]">{workspaces[0].name}</span>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-2">
        {recentBoards.length > 0 && (
          <SidebarSection title={t('sidebar.recent')} defaultOpen={true}>
            {recentBoards.map((b) => (
              <button
                key={b.id}
                onClick={() => navigate(`/boards/${b.id}`)}
                className={`w-full text-left px-5 py-1.5 text-sm rounded transition-colors ${
                  currentBoardId === b.id
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-[#d1d2d3] hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="truncate block">{b.title}</span>
              </button>
            ))}
          </SidebarSection>
        )}

        <SidebarSection title={t('sidebar.boards')} defaultOpen={true}>
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => navigate(`/boards/${board.id}`)}
              className={`w-full text-left px-5 py-1.5 text-sm rounded transition-colors ${
                currentBoardId === board.id
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-[#d1d2d3] hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="truncate block">{board.title}</span>
            </button>
          ))}
          {boards.length === 0 && (
            <p className="px-5 py-2 text-xs text-[#ababad]">{t('empty.title')}</p>
          )}
        </SidebarSection>
      </div>

      {/* Bottom: presence + create */}
      <div className="border-t border-white/10 px-3 py-2 space-y-2">
        {uniqueOnlineCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            <span className="text-xs text-[#ababad]">{uniqueOnlineCount} online</span>
          </div>
        )}
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-2 text-xs text-[#ababad] hover:text-white transition-colors py-1"
        >
          <Plus size={14} />
          {t('create')}
        </button>
      </div>
    </div>
  );
}
