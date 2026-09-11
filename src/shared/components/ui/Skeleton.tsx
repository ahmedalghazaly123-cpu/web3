import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../../shared/lib/utils';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = forwardRef(function Skeleton(
  { className, variant = 'rect', width, height, style, ...props }: SkeletonProps,
  _ref: any,
) {
  const variantClasses = {
    text: 'rounded-sm',
    rect: 'rounded-md',
    circle: 'rounded-full',
  };

  const computedStyle = {
    width: width ?? (variant === 'text' ? '100%' : '1.5rem'),
    height: height ?? (variant === 'text' ? '1rem' : '1.5rem'),
    ...style,
  };

  return (
    <div
      className={cn(
        'bg-surface-tertiary animate-pulse',
        variantClasses[variant],
        className,
      )}
      style={computedStyle}
      {...props}
    />
  );
});
Skeleton.displayName = 'Skeleton';
