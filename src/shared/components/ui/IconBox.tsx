import { type ReactNode } from 'react';
import { cn } from '../../../shared/lib/utils';

/**
 * IconBox — tinted icon container used for feature/category icons.
 * Gives icons visual presence, semantic color and consistent sizing.
 */
export type IconTone = 'brand' | 'ai' | 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral';
export type IconBoxSize = 'sm' | 'md' | 'lg' | 'xl';

export interface IconBoxProps {
  tone?: IconTone;
  size?: IconBoxSize;
  className?: string;
  children: ReactNode;
}

const toneClasses: Record<IconTone, string> = {
  brand: 'bg-brand-bg text-brand ring-1 ring-inset ring-brand/15',
  ai: 'bg-ai-bg text-ai ring-1 ring-inset ring-ai/15',
  success: 'bg-success-bg text-success ring-1 ring-inset ring-success/15',
  warning: 'bg-warning-bg text-warning ring-1 ring-inset ring-warning/15',
  error: 'bg-error-bg text-error ring-1 ring-inset ring-error/15',
  info: 'bg-info-bg text-info ring-1 ring-inset ring-info/15',
  accent: 'bg-accent-bg text-accent ring-1 ring-inset ring-accent/15',
  neutral: 'bg-surface-tertiary text-text-secondary ring-1 ring-inset ring-surface-border',
};

const sizeClasses: Record<IconBoxSize, string> = {
  sm: 'w-8 h-8 rounded-lg [&>svg]:w-4 [&>svg]:h-4',
  md: 'w-10 h-10 rounded-xl [&>svg]:w-5 [&>svg]:h-5',
  lg: 'w-12 h-12 rounded-xl [&>svg]:w-6 [&>svg]:h-6',
  xl: 'w-14 h-14 rounded-2xl [&>svg]:w-7 [&>svg]:h-7',
};

export function IconBox({ tone = 'brand', size = 'md', className, children }: IconBoxProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center flex-shrink-0',
        toneClasses[tone],
        sizeClasses[size],
        className,
      )}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}
