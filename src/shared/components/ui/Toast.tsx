import { type ReactNode, useEffect, useState } from 'react';
import { cn } from '../../../shared/lib/utils';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  variant?: ToastVariant;
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  onClose?: () => void;
  duration?: number;
  className?: string;
}

const variantConfig: Record<ToastVariant, { icon: ReactNode; bg: string; border: string; iconColor: string }> = {
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    bg: 'bg-success-bg',
    border: 'border-success-border',
    iconColor: 'text-success',
  },
  error: {
    icon: <AlertCircle className="w-5 h-5" />,
    bg: 'bg-error-bg',
    border: 'border-error-border',
    iconColor: 'text-error',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    bg: 'bg-warning-bg',
    border: 'border-warning-border',
    iconColor: 'text-warning',
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    bg: 'bg-info-bg',
    border: 'border-info-border',
    iconColor: 'text-info',
  },
};

export function Toast({
  variant = 'info',
  title,
  description,
  icon,
  action,
  onClose,
  duration,
  className,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = variantConfig[variant];
  const { t } = useTranslation('common');

  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border shadow-md',
        config.bg,
        config.border,
        'animate-slide-in',
        className,
      )}
      role="alert"
    >
      <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
        {icon ?? config.icon}
      </div>
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium text-text-primary text-sm">{title}</p>}
        {description && <p className="text-sm text-text-secondary mt-0.5">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onClose && (
        <button
          onClick={() => {
            setIsVisible(false);
            onClose();
          }}
          className="flex-shrink-0 p-1 text-text-tertiary hover:text-text-primary rounded-lg hover:bg-surface-secondary transition-colors"
          aria-label={t('close')}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export interface ToastContainerProps {
  children: ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  className?: string;
}

const positionClasses: Record<string, string> = {
  'top-right': 'top-4 end-4',
  'top-left': 'top-4 start-4',
  'bottom-right': 'bottom-4 end-4',
  'bottom-left': 'bottom-4 start-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

export function ToastContainer({ children, position = 'top-right', className }: ToastContainerProps) {
  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none',
        positionClasses[position],
        className,
      )}
    >
      <div className="pointer-events-auto">
        {children}
      </div>
    </div>
  );
}