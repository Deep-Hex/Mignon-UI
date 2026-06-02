/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ToastContext = createContext(null);

let _toastId = 0;

/**
 * ToastProvider — wraps the app and provides the useToast() hook.
 * Renders a stacked toast container anchored to the bottom-right.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null); // { message, resolve }

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const toast = useMemo(() => ({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  }), [addToast]);

  /**
   * Async confirm dialog. Returns a Promise<boolean>.
   * Usage: const yes = await showConfirm("Delete this?")
   */
  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirm({ message, resolve });
    });
  }, []);

  const handleConfirmResult = useCallback((result) => {
    if (confirm?.resolve) confirm.resolve(result);
    setConfirm(null);
  }, [confirm]);

  const value = useMemo(() => ({ toast, showConfirm }), [toast, showConfirm]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast Stack */}
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <span className="toast-icon">
              {t.type === 'success' && '✓'}
              {t.type === 'error' && '✕'}
              {t.type === 'info' && '◆'}
            </span>
            <span className="toast-message">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirm && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-box">
            <p className="confirm-message">{confirm.message}</p>
            <div className="confirm-actions">
              <button
                className="primary-btn"
                onClick={() => handleConfirmResult(true)}
                autoFocus
              >
                Confirm
              </button>
              <button
                className="secondary-btn"
                onClick={() => handleConfirmResult(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

/**
 * useToast() — access toast notifications and confirm dialogs.
 *
 * @returns {{ toast: { success, error, info }, showConfirm: (msg) => Promise<boolean> }}
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
