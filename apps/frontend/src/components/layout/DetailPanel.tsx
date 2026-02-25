import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui';

const CardDetail = lazy(() => import('@/components/CardDetail'));
const ThreadView = lazy(() => import('@/components/ThreadView'));

export default function DetailPanel({ onResize }: { onResize: (w: number) => void }) {
  const {
    detailPanelOpen,
    detailPanelWidth,
    detailPanelView,
    activeCardId,
    backFromThread,
    closeDetail,
  } = useUIStore();
  const { t } = useTranslation('comment');
  const { t: tc } = useTranslation('common');

  void onResize; // used by AppShell via PanelResizeHandle

  return (
    <div
      className="detail-panel flex-shrink-0 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
      style={{ width: detailPanelOpen ? detailPanelWidth : 0 }}
    >
      {detailPanelOpen && (
        <>
          {/* Panel Header */}
          <div className="detail-panel-header flex items-center justify-between px-4 py-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              {detailPanelView === 'thread' && (
                <button
                  onClick={backFromThread}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm"
                >
                  &larr; {tc('back')}
                </button>
              )}
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {detailPanelView === 'thread' ? t('thread') : t('cardDetails')}
              </span>
            </div>
            <button
              onClick={closeDetail}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <Suspense fallback={<div className="p-4 text-sm text-[var(--text-tertiary)]">{tc('loading')}</div>}>
              {detailPanelView === 'card' && activeCardId && (
                <CardDetail cardId={activeCardId} />
              )}
              {detailPanelView === 'thread' && <ThreadView />}
            </Suspense>
          </div>
        </>
      )}
    </div>
  );
}
