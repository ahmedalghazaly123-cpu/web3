import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../../shared/lib/utils';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'interactive' | 'gradient';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
  glow?: 'brand' | 'ai' | 'accent' | 'success' | 'warning';
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-surface border border-surface-border shadow-xs',
  elevated: 'bg-surface-elevated border border-surface-border shadow-sm hover:shadow-md transition-shadow duration-200',
  outlined: 'bg-transparent border border-surface-border-strong',
  interactive: 'bg-surface border border-surface-border shadow-sm hover:shadow-lg hover:border-surface-border-hover hover:-translate-y-0.5 transition-all duration-200 ease-out cursor-pointer',
  gradient: 'bg-gradient-to-br from-surface to-surface-secondary border border-surface-border shadow-xs',
};

const glowClasses: Record<string, string> = {
  brand: 'shadow-[0_0_20px_rgba(15,118,110,0.15)]',
  ai: 'shadow-[0_0_20px_rgba(99,102,241,0.15)]',
  accent: 'shadow-[0_0_20px_rgba(217,119,6,0.15)]',
  success: 'shadow-[0_0_20px_rgba(5,150,105,0.15)]',
  warning: 'shadow-[0_0_20px_rgba(217,119,6,0.15)]',
};

const paddingClasses: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
  xl: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant = 'default', padding = 'md', hover, glow, ...props }: CardProps,
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl',
        variantClasses[variant],
        paddingClasses[padding],
        hover && 'hover:shadow-lg hover:border-surface-border-hover transition-all duration-200 ease-out',
        glow && glowClasses[glow],
        className,
      )}
      {...props}
    />
  );
});
Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}
export const CardHeader = forwardRef(function CardHeader({ className, ...props }: CardHeaderProps, _ref: any) {
  return <div className={cn('mb-4', className)} {...props} />;
});
CardHeader.displayName = 'CardHeader';

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}
export const CardContent = forwardRef(function CardContent({ className, ...props }: CardContentProps, _ref: any) {
  return <div className={cn(className)} {...props} />;
});
CardContent.displayName = 'CardContent';

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}
export const CardFooter = forwardRef(function CardFooter({ className, ...props }: CardFooterProps, _ref: any) {
  return <div className={cn('mt-4 pt-4 border-t border-surface-border', className)} {...props} />;
});
CardFooter.displayName = 'CardFooter';
