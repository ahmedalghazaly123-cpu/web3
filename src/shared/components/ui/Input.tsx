import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../../shared/lib/utils';

export type InputVariant = 'default' | 'filled' | 'error' | 'success';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  description?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-8 px-3 text-body-sm',
  md: 'h-10 px-3 text-body',
  lg: 'h-12 px-4 text-body-lg',
};

const variantClasses: Record<InputVariant, string> = {
  default: 'bg-surface border border-surface-border hover:border-surface-border-hover focus:border-brand focus:ring-2 focus:ring-brand/20 text-text-primary transition-all duration-150',
  filled: 'bg-surface-secondary border border-surface-border hover:border-surface-border-hover focus:border-brand focus:ring-2 focus:ring-brand/20 text-text-primary transition-all duration-150',
  error: 'bg-surface border border-error focus:border-error focus:ring-2 focus:ring-error/20 text-text-primary transition-all duration-150',
  success: 'bg-surface border border-success focus:border-success focus:ring-2 focus:ring-success/20 text-text-primary transition-all duration-150',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, variant = 'default', size = 'md', label, description, error, leftIcon, rightIcon, required, id, ...props },
  ref,
) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const inputClasses = cn(
    'w-full rounded-md transition-colors duration-150',
    'placeholder:text-text-tertiary',
    'focus-visible:outline-none',
    sizeClasses[size],
    error ? variantClasses.error : variantClasses[variant],
    leftIcon && 'ps-10',
    rightIcon && 'pe-10',
    className,
  );

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-label font-medium text-text-primary mb-1.5">
          {label}
          {required && <span className="text-error" aria-hidden="true"> *</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-text-tertiary pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={inputClasses}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <span className="absolute inset-y-0 end-0 flex items-center pe-3 text-text-tertiary pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
      {description && <p className="mt-1.5 text-caption text-text-secondary">{description}</p>}
      {error && <p id={`${inputId}-error`} className="mt-1.5 text-caption text-error" role="alert">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';

