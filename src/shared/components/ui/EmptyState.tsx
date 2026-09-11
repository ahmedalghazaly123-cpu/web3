import { type ReactNode } from 'react';
import { cn } from '../../../shared/lib/utils';
import { IconBox, type IconTone } from './IconBox';

/**
 * EmptyState — explains what is empty, why, and what to do next.
 * Used across lists, search results, notifications, planner, etc.
 */
export interface EmptyStateProps {
  icon: ReactNode;
  tone?: IconTone;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
  /** Absolute or asset path to an SVG illustration rendered above the icon. */
  illustration?: string;
  /** Custom alt text for the illustration (defaults to empty). */
  illustrationAlt?: string;
}

export function EmptyState({ icon, tone = 'neutral', title, description, action, className, compact, illustration, illustrationAlt }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-14 px-6',
        className,
      )}
    >
      {illustration ? (
        <div className="relative mb-5 group">
          {/* Soft glowing halo behind the illustration */}
          <div className="absolute -inset-2 -z-10 rounded-full bg-surface-secondary/60 glow-brand scale-90 pointer-events-none" aria-hidden="true"></div>
          <img
            src={illustration}
            alt={illustrationAlt ?? ''}
            loading="lazy"
            className="w-36 h-36 object-contain drop-shadow relative animate-float"
          />
        </div>
      ) : (
        <IconBox tone={tone} size={compact ? 'md' : 'xl'} className="mb-4">
          {icon}
        </IconBox>
      )}
      <h3 className={cn('font-semibold text-text-primary', compact ? 'text-body-sm' : 'h4')}>{title}</h3>
      {description && (
        <p className={cn('text-text-secondary mt-1.5 max-w-sm', compact ? 'text-caption' : 'body-sm')}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
