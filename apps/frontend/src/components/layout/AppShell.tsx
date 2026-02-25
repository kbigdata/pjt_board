import { useEffect } from 'react';
import { useUIStore } from '@/stores/ui';
import NavBar from './NavBar';
import BoardSidebar from './BoardSidebar';
import DetailPanel from './DetailPanel';
import ActivityView from '@/components/ActivityView';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const {
    sidebarOpen,
    sidebarWidth,
    detailPanelOpen,
    detailPanelWidth,
    toggleSidebar,
    setSidebarWidth,
    setDetailPanelWidth,
    closeDetail,
    theme,
    activeNavView,
  } = useUIStore();

  // Apply theme to document
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'b' || e.key === 'B') toggleSidebar();
      if (e.key === 'Escape') closeDetail();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [toggleSidebar, closeDetail]);

  void setSidebarWidth;
  void setDetailPanelWidth;
  void sidebarWidth;
  void detailPanelWidth;
  void detailPanelOpen;

  return (
    <div
      className="flex h-screen overflow-hidden bg-[var(--main-bg,#f8f9fa)]"
      style={
        {
          '--sidebar-width': `${sidebarOpen ? sidebarWidth : 0}px`,
          '--detail-panel-width': `${detailPanelOpen ? detailPanelWidth : 0}px`,
        } as React.CSSProperties
      }
    >
      <NavBar />
      {sidebarOpen && (
        <div
          className="flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
          style={{ width: sidebarWidth }}
        >
          <BoardSidebar />
        </div>
      )}
      <main className="flex-1 overflow-auto min-w-0">
        {activeNavView === 'activity' ? <ActivityView /> : children}
      </main>
      <DetailPanel onResize={(w) => setDetailPanelWidth(Math.max(320, Math.min(560, w)))} />
    </div>
  );
}
