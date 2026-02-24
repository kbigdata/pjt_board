import { useState, useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  onNewCard?: () => void;
  onFocusSearch?: () => void;
  onCloseModal?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const [showHelp, setShowHelp] = useState(false);

  const isInputFocused = useCallback((): boolean => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return (
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      (el as HTMLElement).isContentEditable
    );
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when modifier keys are held (except Escape)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Escape: close modal — always fires
      if (e.key === 'Escape') {
        if (showHelp) {
          setShowHelp(false);
          return;
        }
        options.onCloseModal?.();
        return;
      }

      // All other shortcuts: skip when an input is focused
      if (isInputFocused()) return;

      switch (e.key) {
        case 'n':
        case 'N':
          e.preventDefault();
          options.onNewCard?.();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          options.onFocusSearch?.();
          break;
        case '?':
          e.preventDefault();
          setShowHelp((v) => !v);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showHelp, isInputFocused, options]);

  return { showHelp, setShowHelp };
}
