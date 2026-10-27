import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 3500);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success' || !toast.type;
  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  return (
    <div className="fixed top-5 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-5 duration-300">
      <div
        className={`pointer-events-auto max-w-md w-full bg-white rounded-2xl shadow-xl border p-4 flex items-start gap-3.5 ${
          isSuccess
            ? 'border-emerald-200 shadow-emerald-100/50'
            : isError
            ? 'border-rose-200 shadow-rose-100/50'
            : 'border-indigo-200 shadow-indigo-100/50'
        }`}
      >
        <div
          className={`p-2 rounded-xl flex-shrink-0 ${
            isSuccess
              ? 'bg-emerald-50 text-emerald-600'
              : isError
              ? 'bg-rose-50 text-rose-600'
              : 'bg-indigo-50 text-indigo-600'
          }`}
        >
          {isSuccess && <CheckCircle2 className="w-5 h-5" />}
          {isError && <AlertCircle className="w-5 h-5" />}
          {isInfo && <Info className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <h4 className="text-xs font-bold text-slate-900 leading-tight">
            {toast.title || (isSuccess ? 'Berhasil Disimpan' : isError ? 'Terjadi Kesalahan' : 'Informasi')}
          </h4>
          {toast.message && (
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              {toast.message}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
