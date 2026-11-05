import React, { useState, useEffect } from 'react';
import DonorBadge from './DonorBadge';
import CountdownTimer from './CountdownTimer';
import { 
  ShoppingBag, 
  MapPin, 
  Phone, 
  Clock, 
  Users, 
  ExternalLink, 
  Star, 
  CheckCircle2, 
  AlertCircle,
  ShieldAlert 
} from 'lucide-react';

export default function MyBookingsView({
  currentUser,
  onOpenRatingModal,
  onSwitchToFeed
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/my-bookings?receiver_id=${currentUser.id}`);
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [currentUser]);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                My Food Bookings
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active and past food claims for {currentUser?.name}.
            </p>
          </div>

          <button
            onClick={onSwitchToFeed}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Explore Surplus Feed</span>
          </button>
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Loading your bookings...
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
          <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No active bookings
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
            Browse available food donations on the live feed and claim meals before they expire.
          </p>
          <button
            onClick={onSwitchToFeed}
            className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-md hover:bg-brand-700 transition-all"
          >
            Find Food Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const isActive = b.status === 'active';
            const isCollected = b.status === 'collected';
            const isExpiredUncollected = b.status === 'expired_uncollected';

            return (
              <div
                key={b.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border shadow-sm transition-all ${
                  isActive 
                    ? 'border-brand-300 dark:border-brand-700/60 ring-2 ring-brand-500/10' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left Column: Food Details */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          : isCollected
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}>
                        {isActive && '🔵 Reserved for Pickup'}
                        {isCollected && '✅ Collected'}
                        {isExpiredUncollected && '⚠️ Expired Before Pickup'}
                      </span>

                      {isActive && (
                        <CountdownTimer 
                          expiresAt={b.expires_at} 
                          onExpire={fetchBookings}
                        />
                      )}

                      <DonorBadge 
                        donorType={b.donor_type} 
                        isVerified={true} 
                        size="sm" 
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {b.food_item}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {b.servings} Servings
                        </span>
                        <span>•</span>
                        <span className="capitalize">{b.food_type}</span>
                        <span>•</span>
                        <span className="capitalize">{b.packaging}</span>
                      </div>
                    </div>

                    {/* Pickup Address & Contact Details */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                      <div className="flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200">
                        <MapPin className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold">Pickup Location: </span>
                          <span>{b.pickup_address}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200">
                        <Phone className="w-4 h-4 text-brand-600 shrink-0" />
                        <div>
                          <span className="font-bold">Donor Contact: </span>
                          <a href={`tel:${b.donor_contact}`} className="underline font-bold text-brand-600 dark:text-brand-400">
                            {b.donor_contact}
                          </a>
                          <span className="text-slate-500 ml-1">({b.donor_name})</span>
                        </div>
                      </div>

                      {b.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="font-semibold">Notes: </span> {b.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>Check the food is fresh before eating.</span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-center">
                    {/* Directions link */}
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(b.pickup_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Get Directions</span>
                    </a>

                    {/* Rate Donor Button */}
                    {isCollected && !b.user_given_rating && (
                      <button
                        onClick={() => onOpenRatingModal({
                          booking_id: b.id,
                          from_user_id: currentUser.id,
                          to_user_id: b.donor_id || 1,
                          target_name: b.donor_name,
                          direction: 'receiver_to_donor'
                        })}
                        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>Rate Donor</span>
                      </button>
                    )}

                    {b.user_given_rating && (
                      <span className="text-xs text-center text-slate-400 font-semibold py-2">
                        ⭐ Rated {b.user_given_rating}/5
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
