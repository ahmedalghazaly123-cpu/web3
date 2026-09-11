import { type HTMLAttributes, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../shared/lib/utils';

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'brand' | 'ai' | 'info' | 'success' | 'warning' | 'error';
  striped?: boolean;
  animated?: boolean;
  label?: boolean;
}

const sizeClasses: Record<NonNullable<ProgressBarProps['size']>, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3.5',
};

const trackClasses: Record<NonNullable<ProgressBarProps['variant']>, string> = {
  default: 'bg-surface-tertiary',
  brand: 'bg-brand-bg',
  ai: 'bg-ai-bg',
  info: 'bg-info-bg',
  success: 'bg-success-bg',
  warning: 'bg-warning-bg',
  error: 'bg-error-bg',
};

const fillClasses: Record<NonNullable<ProgressBarProps['variant']>, string> = {
  default: 'bg-text-tertiary',
  brand: 'bg-brand',
  ai: 'bg-ai',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};

export const ProgressBar = forwardRef(function ProgressBar(
  { className, value, max = 100, size = 'md', variant = 'default', striped, animated, label, ...props }: ProgressBarProps,
  _ref: any,
) {
  const { t } = useTranslation('common');
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-caption text-text-secondary">{t('progressLabel')}</span>
          <span className="text-caption text-text-secondary">{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-full overflow-hidden',
          sizeClasses[size],
          trackClasses[variant],
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-normal ease-out',
            fillClasses[variant],
            striped && 'bg-stripes',
            animated && 'animate-pulse',
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});
ProgressBar.displayName = 'ProgressBar';
