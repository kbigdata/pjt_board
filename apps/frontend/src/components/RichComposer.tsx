import { useState, useRef, useEffect } from 'react';
import { Bold, Italic, AtSign } from 'lucide-react';

interface Props {
  onSubmit: (content: string) => void;
  placeholder?: string;
  onCancel?: () => void;
}

export default function RichComposer({ onSubmit, placeholder = 'Write something...', onCancel }: Props) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(ta).lineHeight || '20', 10);
    const minH = lineHeight * 2;
    const maxH = lineHeight * 8;
    ta.style.height = `${Math.min(maxH, Math.max(minH, ta.scrollHeight))}px`;
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setContent('');
  };

  const wrapSelection = (prefix: string, suffix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end);
    const before = content.slice(0, start);
    const after = content.slice(end);
    const newContent = `${before}${prefix}${selected}${suffix}${after}`;
    setContent(newContent);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  return (
    <div className="border border-[var(--border-primary)] rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-[var(--border-focus)] focus-within:border-[var(--border-focus)]">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 pt-1.5 pb-0">
        <button
          type="button"
          onClick={() => wrapSelection('**', '**')}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded text-xs"
          title="Bold (Ctrl+B)"
        >
          <Bold size={13} />
        </button>
        <button
          type="button"
          onClick={() => wrapSelection('_', '_')}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded text-xs"
          title="Italic (Ctrl+I)"
        >
          <Italic size={13} />
        </button>
        <button
          type="button"
          onClick={() => {
            const ta = textareaRef.current;
            if (!ta) return;
            const pos = ta.selectionStart;
            const before = content.slice(0, pos);
            const after = content.slice(pos);
            setContent(`${before}@${after}`);
            setTimeout(() => {
              ta.focus();
              ta.setSelectionRange(pos + 1, pos + 1);
            }, 0);
          }}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded text-xs"
          title="Mention"
        >
          <AtSign size={13} />
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            wrapSelection('**', '**');
          } else if (e.ctrlKey && e.key === 'i') {
            e.preventDefault();
            wrapSelection('_', '_');
          } else {
            handleKeyDown(e);
          }
        }}
        placeholder={placeholder}
        className="w-full px-3 pb-2 pt-1 text-sm focus:outline-none resize-none bg-transparent min-h-[2.5rem] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        style={{ height: 'auto' }}
      />

      <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <span className="text-xs text-[var(--text-tertiary)]">Enter to send, Shift+Enter for newline</span>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="px-3 py-1 text-xs bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
