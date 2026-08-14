import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
}

interface ToastContextValue {
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
let nextToastId = 1;

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: number) => void;
}

const ToastItem: FC<ToastItemProps> = ({ toast, onDismiss }) => (
  <div className="toast toast-success" role="status">
    <CheckCircle2 size={18} aria-hidden="true" />
    <span>{toast.message}</span>
    <button
      type="button"
      className="toast-dismiss"
      aria-label="Dismiss notification"
      onClick={() => onDismiss(toast.id)}
    >
      <X size={16} aria-hidden="true" />
    </button>
  </div>
);

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = useCallback(
    (message: string) => {
      const id = nextToastId++;
      setToasts((current) => [...current, { id, message }]);
      window.setTimeout(() => dismissToast(id), 5_000);
    },
    [dismissToast],
  );

  return (
    <ToastContext.Provider value={{ showSuccess }}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
