import React, { useState } from 'react';
import { X, Clock, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authFetch } from '../utils/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentExpiry: string | null;
}

export const ExtensionRequestModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, currentExpiry }) => {
  const [duration, setDuration] = useState('1 Month');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await authFetch('/api/gateway/extension-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_duration: duration,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit extension request');
      }

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setIsSuccess(false);
        setReason('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error submitting request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">Request Access Extension</h3>
              <p className="text-xs text-stone-500">Submit an extension request for administrator review</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-stone-900 text-lg">Request Submitted!</h4>
            <p className="text-sm text-stone-600">
              Your extension request has been sent to the administrator for review.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Current Expiry Status
              </label>
              <div className="text-sm px-3.5 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-medium">
                {currentExpiry ? (
                  new Date(currentExpiry).getTime() < Date.now() ? (
                    <span className="text-red-700 font-semibold">
                      Expired on {new Date(currentExpiry).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                  ) : (
                    <span>Expires {new Date(currentExpiry).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                  )
                ) : (
                  'No expiry set / Inactive'
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Requested Duration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['1 Month', '3 Months', '6 Months'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDuration(opt)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      duration === opt
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Reason / Note for Administrator (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Preparing for upcoming NRE exam date in November..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-stone-600 font-medium text-sm hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#830e0d] text-white font-semibold text-sm hover:bg-[#6f0c0b] transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
