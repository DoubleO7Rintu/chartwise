'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
};

export default function SettingsPanel({ theme, onToggleTheme }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((current) => !current)}
        className="theme-toggle"
        title="Open settings"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        ⚙️
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">Settings</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Personalize the workspace experience.</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Theme</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Switch between dark and light chart surfaces.
                </p>
              </div>

              <button
                onClick={onToggleTheme}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-all hover:border-[var(--accent)]"
              >
                <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
                <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Keyboard</p>
            <ul className="mt-2 space-y-2 text-sm text-[var(--text-primary)]">
              <li className="flex justify-between gap-3"><span>Toggle theme</span><code className="text-xs text-[var(--text-secondary)]">T</code></li>
              <li className="flex justify-between gap-3"><span>Next asset</span><code className="text-xs text-[var(--text-secondary)]">→</code></li>
              <li className="flex justify-between gap-3"><span>Previous asset</span><code className="text-xs text-[var(--text-secondary)]">←</code></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
