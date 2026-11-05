import React, { useState } from 'react';
import { X, Flag, AlertTriangle, ShieldAlert } from 'lucide-react';

const REPORT_REASONS = [
  'spoiled food',
  'wrong address',
  'fake donor',
  'other'
];

export default function ReportModal({
  isOpen,
  onClose,
  post,
  currentUser,
  onReportSubmitted
}) {
  const [reason, setReason] = useState('spoiled food');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !post) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please log in to report a listing.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${post.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_id: currentUser.id,
          reporter_name: currentUser.name,
          reason,
          details
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit report');
      }

      alert(data.message);
      if (onReportSubmitted) onReportSubmitted(post.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <Flag className="w-5 h-5" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Report Food Listing
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300">
          <p className="font-bold text-slate-900 dark:text-white">{post.food_item}</p>
          <p className="text-[11px] text-slate-500">Posted by {post.donor_name}</p>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Violation Reason *
            </label>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs font-semibold capitalize transition-all ${
                    reason === r
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{r}</span>
                  <input
                    type="radio"
                    name="report_reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Additional Details (Optional)
            </label>
            <textarea
              rows="3"
              placeholder="Please describe what you observed (e.g. food odor, incorrect pickup phone, inaccessible location)..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            ></textarea>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Community Safety Notice: Three reports automatically hide the listing and trigger priority review by PlateShare Admin.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
