import { useEffect, useRef } from 'react';

interface Shortcut {
  key: string;
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { key: 'n', description: 'Create a new card (focuses first column)' },
  { key: 'f', description: 'Focus search / filter input' },
  { key: 'Esc', description: 'Close open modal or panel' },
  { key: '?', description: 'Show / hide this keyboard shortcuts help' },
];

interface KeyboardShortcutHelpProps {
  onClose: () => void;
}

export default function KeyboardShortcutHelp({ onClose }: KeyboardShortcutHelpProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-gray-500 border-b">
              <th className="text-left pb-2 font-semibold w-24">Key</th>
              <th className="text-left pb-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {SHORTCUTS.map((s) => (
              <tr key={s.key}>
                <td className="py-2.5 pr-4">
                  <kbd className="inline-block px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-700">
                    {s.key}
                  </kbd>
                </td>
                <td className="py-2.5 text-gray-700">{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-xs text-gray-400 mt-4">
          Shortcuts are disabled when an input field is focused.
        </p>
      </div>
    </div>
  );
}
