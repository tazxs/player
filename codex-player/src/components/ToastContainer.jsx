import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import usePlayerStore from '../store/playerStore';

export default function ToastContainer() {
  const toasts = usePlayerStore((s) => s.toasts);
  const removeToast = usePlayerStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          let Icon = Info;
          let iconColor = 'text-blue-400';

          if (toast.type === 'success') {
            Icon = CheckCircle;
            iconColor = 'text-green-400';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            iconColor = 'text-[var(--accent)]';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="pointer-events-auto bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl rounded-xl p-4 min-w-[300px] max-w-sm flex items-start gap-3 origin-center"
            >
              <Icon className={`flex-shrink-0 mt-0.5 ${iconColor}`} size={20} />

              <div className="flex-1 text-sm font-medium text-[var(--text-primary)] leading-snug">
                {toast.message}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
