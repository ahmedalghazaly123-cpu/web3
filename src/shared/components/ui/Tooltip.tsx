import { type ReactNode, useState, useRef, useEffect, forwardRef } from 'react';
import { cn } from '../../../shared/lib/utils';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: 'top' | 'bottom' | 'start' | 'end';
  delay?: number;
  className?: string;
}

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(
  { content, children, placement = 'top', delay = 200, className }: TooltipProps,
  ref,
) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(false), delay);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const placementClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    start: 'top-1/2 -translate-y-1/2 end-0 me-2',
    end: 'top-1/2 -translate-y-1/2 start-0 ms-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-border dark:border-t-dark-surface-border',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-surface-border dark:border-b-dark-surface-border',
    start: 'top-1/2 -translate-y-1/2 border-4 border-transparent border-s-surface-border dark:border-s-dark-surface-border',
    end: 'top-1/2 -translate-y-1/2 border-4 border-transparent border-e-surface-border dark:border-e-dark-surface-border',
  };

  return (
    <div className={cn('relative inline-block', className)} ref={ref}>
      <div
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>
      {visible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-30 px-2.5 py-1.5 text-caption text-text-primary bg-surface-elevated border border-surface-border shadow-lg rounded',
            'pointer-events-none',
            placementClasses[placement],
          )}
        >
          <div className="whitespace-nowrap">{content}</div>
          <div className={cn('absolute', arrowClasses[placement])} />
        </div>
      )}
    </div>
  );
});
Tooltip.displayName = 'Tooltip';

