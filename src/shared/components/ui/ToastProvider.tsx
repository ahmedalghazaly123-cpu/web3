import { createContext, useContext, useState, type ReactNode } from 'react';
import { Toast, ToastContainer, type ToastVariant } from './Toast';

export interface ToastOptions {
  variant?: ToastVariant;
  title?: string;
  description?: string;
  /** Auto-dismiss after this many milliseconds (default: 4000). */
  duration?: number;
}

export interface ActiveToast extends ToastOptions {
  id: number;
}

type ShowToast = (options: ToastOptions) => void;

const ToastContext = createContext<ShowToast | null>(null);

let nextId = 1;

/**
 * ToastProvider — global toast queue with a `useToast()` hook.
 * Wrap the top-level layout with this, then call `toast(...)` anywhere.
 *
 * ```tsx
 * const toast = useToast();
 * toast({ variant: 'success', title: 'Saved!', description: 'Your changes were saved.' });
 * ```
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const dismiss = (id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  };

  const show: ShowToast = (options) => {
    const id = nextId++;
    setToasts((current) => [...current, { id, ...options }]);
  };

  return (
    <ToastContext.Provider value={show}>
      {children}
      <ToastContainer position="bottom-center" className="mb-6">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            title={t.title}
            description={t.description}
            duration={t.duration ?? 4000}
            onClose={() => dismiss(t.id)}
          />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return show;
}