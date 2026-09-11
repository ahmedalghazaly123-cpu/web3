import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { cn } from '../../../shared/lib/utils';

export type ButtonVariant =
  | 'primary' | 'primary-ghost' | 'secondary' | 'secondary-ghost'
  | 'ghost' | 'outline' | 'ai' | 'success' | 'warning' | 'error' | 'surface'
  | 'surface-secondary';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover active:bg-brand-active focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 shadow-sm hover:shadow-md transition-all duration-150',
  'primary-ghost': 'text-brand bg-brand-bg hover:bg-brand/15 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-all duration-150',
  secondary: 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary border border-surface-border focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-all duration-150',
  'secondary-ghost': 'text-text-secondary hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-all duration-150',
  ghost: 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-all duration-150',
  outline: 'bg-transparent border border-surface-border-strong text-text-secondary hover:bg-surface-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-all duration-150',
  ai: 'bg-ai text-white hover:bg-ai/90 focus-visible:ring-2 focus-visible:ring-ai focus-visible:ring-offset-2 shadow-sm hover:shadow-md transition-all duration-150',
  success: 'bg-success text-white hover:bg-success/90 focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 shadow-sm transition-all duration-150',
  warning: 'bg-warning text-white hover:bg-warning/90 focus-visible:ring-2 focus-visible:ring-warning focus-visible:ring-offset-2 shadow-sm transition-all duration-150',
  error: 'bg-error text-white hover:bg-error/90 focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 shadow-sm transition-all duration-150',
  surface: 'bg-surface text-text-primary hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 border border-surface-border shadow-xs transition-all duration-150',
  'surface-secondary': 'bg-surface-secondary text-text-primary hover:bg-surface-tertiary focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 border border-surface-border transition-all duration-150',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-caption',
  sm: 'h-8 px-3 text-body-sm',
  md: 'h-9 px-4 text-button',
  lg: 'h-10 px-5 text-body',
  xl: 'h-12 px-6 text-body-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, fullWidth, disabled, ...props }: ButtonProps,
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium',
        'focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none',
        'transition-all duration-150',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ms-1 me-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.221l2.828-2.828A7.991 7.991 0 0012 19.2V16c-2.215-.457-3.993-2.24-4.433-4.415l-.02.015A8.003 8.003 0 004 12.565v.657z"></path>
        </svg>
      ) : null}
      {!isLoading && leftIcon && <span className="me-2 flex items-center">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ms-2 flex items-center">{rightIcon}</span>}
    </button>
  );
});
Button.displayName = 'Button';
