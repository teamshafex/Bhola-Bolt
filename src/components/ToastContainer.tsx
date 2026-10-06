import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastItem } from '../types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      id="toast-container"
      className="fixed z-50 pointer-events-none flex flex-col gap-2
                 bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const borderLeftColor =
            toast.type === 'success'
              ? 'border-l-[#22c55e]'
              : toast.type === 'error'
              ? 'border-l-[#ef4444]'
              : 'border-l-[#f97316]';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto bg-[#1c1c1c] border border-[#262626] border-l-4 ${borderLeftColor}
                          rounded-xl p-3.5 shadow-2xl flex items-center justify-between gap-3 text-sm`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'success' && (
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                )}
                {toast.type === 'error' && (
                  <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0" />
                )}
                {toast.type === 'info' && (
                  <Info className="w-4 h-4 text-[#f97316] shrink-0" />
                )}
                <span className="text-sm font-medium text-[#fafafa]">{toast.message}</span>
              </div>
              <button
                id={`dismiss-toast-${toast.id}`}
                onClick={() => onDismiss(toast.id)}
                className="text-[#52525b] hover:text-[#fafafa] p-1 transition-colors"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
