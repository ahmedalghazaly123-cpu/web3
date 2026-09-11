import { type HTMLAttributes, type ReactNode, useState, useRef, useEffect, forwardRef } from 'react';
import { cn } from '../../../shared/lib/utils';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  dividerBefore?: boolean;
}

export interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'start' | 'center' | 'end';
  placement?: 'bottom' | 'top';
  width?: string;
}

export const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(function Dropdown(
  { trigger, items, align = 'end', placement = 'bottom', width = 'w-48', className },
  ref,
) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const alignPos = { start: 'start-0', center: 'left-1/2 -translate-x-1/2', end: 'end-0' }[align];

  return (
    <div className={cn('relative inline-block', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-md"
      >
        {trigger}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />

          {/* Menu */}
          <div
            ref={ref}
            role="menu"
            className={cn(
              'absolute z-20 mt-2',
              alignPos,
              placement === 'top' ? 'bottom-full mb-2' : 'top-full',
              width,
              'bg-surface border border-surface-border shadow-xl rounded-lg py-1',
            )}
          >
            {items.map((item) => (
              <div key={item.id} role="none">
                {item.dividerBefore && <div className="border-t border-surface-border my-1" role="separator" />}
                <button
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    item.onClick?.();
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-sm text-start',
                    'hover:bg-surface-secondary transition-colors',
                    !item.danger && 'text-text-secondary hover:text-text-primary',
                    item.danger && 'text-error hover:bg-error-bg',
                    item.disabled && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {item.icon && <span className="w-4 h-4 flex items-center">{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && <kbd className="text-caption text-text-tertiary bg-surface-tertiary px-1.5 py-0.5 rounded">{item.shortcut}</kbd>}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
});
Dropdown.displayName = 'Dropdown';

