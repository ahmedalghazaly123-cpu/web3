import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../../shared/lib/utils';

export interface ProgressRingProps extends HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  size?: number; // diameter in px
  strokeWidth?: number;
  color?: 'brand' | 'success' | 'warning' | 'error' | 'ai' | 'text-secondary';
  label?: boolean;
  center?: boolean;
}

const colorMap: Record<NonNullable<ProgressRingProps['color']>, string> = {
  brand: 'var(--color-brand)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  ai: 'var(--color-ai)',
  'text-secondary': 'var(--color-text-secondary)',
};

export const ProgressRing = forwardRef<HTMLDivElement, ProgressRingProps>(function ProgressRing(
  { className, value, size = 120, strokeWidth = 6, color = 'brand', label, center, ...props }: ProgressRingProps,
  ref,
) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;
  const offset = circumference - (value / 100) * circumference;
  const strokeColor = colorMap[color];

  return (
    <div
      ref={ref}
      className="relative inline-flex flex-col items-center"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div className="relative inline-flex" style={{ width: size, height: size }}>
        <svg width={size} height={size} className={cn('progress-ring', className)}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            stroke="var(--color-surface-border)"
            strokeLinecap="round"
          />
          {/* Progress circle with subtle glow */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            stroke={strokeColor}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
              filter: `drop-shadow(0 0 3px ${strokeColor})`,
            }}
          />
        </svg>
        {center && (
          <span
            className="absolute inset-0 flex items-center justify-center font-bold text-text-primary"
            style={{ fontSize: Math.max(12, size * 0.2) }}
            aria-hidden="true"
          >
            {Math.round(value)}%
          </span>
        )}
      </div>
      {label && (
        <span className="mt-1 text-sm font-medium text-text-primary">{Math.round(value)}%</span>
      )}
    </div>
  );
});
ProgressRing.displayName = 'ProgressRing';
