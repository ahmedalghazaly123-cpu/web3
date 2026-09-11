import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../../shared/lib/utils';

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'surface' | 'success' | 'warning' | 'error' | 'info' | 'ai' | 'outline';
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-tertiary text-text-secondary border border-surface-border',
  primary: 'bg-brand text-white',
  secondary: 'bg-surface-tertiary text-text-secondary border border-surface-border',
  surface: 'bg-surface-secondary text-text-secondary border border-surface-border',
  success: 'bg-success-bg text-success border border-success-border',
  warning: 'bg-warning-bg text-warning border border-warning-border',
  error: 'bg-error-bg text-error border border-error-border',
  info: 'bg-info-bg text-info border border-info-border',
  ai: 'bg-ai-bg text-ai border border-ai-border',
  outline: 'bg-transparent border border-surface-border-strong text-text-secondary',
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-caption',
  md: 'px-2.5 py-0.5 text-caption',
  lg: 'px-3 py-1 text-body-sm',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant = 'default', size = 'md', dot, children, ...props }: BadgeProps,
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        variantClasses[variant],
        sizeClasses[size],
        dot && 'ps-1.5',
        className,
      )}
      {...props}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current me-1" />}
      {children}
    </span>
  );
});
Badge.displayName = 'Badge';
