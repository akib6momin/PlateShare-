import React, { useState } from 'react';
import { X, Star, HeartHandshake } from 'lucide-react';

export default function RatingModal({
  isOpen,
  onClose,
  ratingData,
  onRatingSubmitted
}) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !ratingData) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: ratingData.booking_id,
          from_user_id: ratingData.from_user_id,
          to_user_id: ratingData.to_user_id,
          direction: ratingData.direction,
          rating,
          comment
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit rating');
      }

      alert(data.message);
      if (onRatingSubmitted) onRatingSubmitted();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors text-center">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/60 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-3">
          <Star className="w-6 h-6 fill-current" />
        </div>

        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Rate {ratingData.target_name}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
          {ratingData.direction === 'donor_to_receiver'
            ? 'How was your experience coordinating pickup with this receiver?'
            : 'How was your food collection experience with this donor?'}
        </p>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star selector */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(rating)}
                onClick={() => setRating(star)}
                className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
              >
                <Star
                  className={`w-8 h-8 ${
                    (hoverRating || rating) >= star
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-200 dark:text-slate-700'
                  }`}
                />
              </button>
            ))}
          </div>

          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
            {rating === 5 && '🌟 Exceptional / Flawless'}
            {rating === 4 && '👍 Great experience'}
            {rating === 3 && '👌 Good / Average'}
            {rating === 2 && '👎 Below expectations'}
            {rating === 1 && '⚠️ Poor / Disappointing'}
          </span>

          <div>
            <textarea
              rows="3"
              placeholder="Leave a short comment (e.g. food was warm and well-packed, quick polite pickup)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            ></textarea>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md transition-all"
            >
              {loading ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
