import React, { useState } from 'react';
import DonorBadge from './DonorBadge';
import CountdownTimer from './CountdownTimer';
import { 
  MapPin, 
  Users, 
  Package, 
  AlertCircle, 
  Flag, 
  CheckCircle2, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp, 
  Utensils 
} from 'lucide-react';

export default function FoodCard({
  post,
  currentUser,
  onBook,
  onReport,
  onExpire
}) {
  const [isBooking, setIsBooking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const isVeg = post.food_type === 'veg';
  const allergens = post.allergens || [];

  const handleBookClick = async () => {
    if (!currentUser) {
      alert('Please select or log in as a receiver (NGO or person in need) to book food.');
      return;
    }

    if (currentUser.role === 'donor') {
      alert('You are logged in as a Donor. Please switch to a Receiver (e.g. Hope NGO or Rahul) using the user switcher above to book food.');
      return;
    }

    setIsBooking(true);
    try {
      await onBook(post);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-300 hover:shadow-lg overflow-hidden flex flex-col justify-between ${
      post.is_urgent 
        ? 'border-amber-300 dark:border-amber-700/60 ring-2 ring-amber-400/20' 
        : 'border-slate-200 dark:border-slate-800'
    }`}>
      {/* Top Banner / Image Section */}
      <div className="relative h-48 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {post.photo_url ? (
          <img 
            src={post.photo_url} 
            alt={post.food_item} 
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            onError={(e) => {
              // Fallback to stylized placeholder
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}

        {/* Fallback pattern when no photo */}
        <div 
          className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${
            isVeg ? 'from-emerald-500/10 to-teal-500/20' : 'from-amber-500/10 to-rose-500/20'
          } ${post.photo_url ? 'hidden' : 'flex'}`}
        >
          <Utensils className={`w-12 h-12 ${isVeg ? 'text-emerald-500' : 'text-amber-500'} opacity-40`} />
          <span className="text-xs font-semibold text-slate-400 mt-2">Plate Share Verified</span>
        </div>

        {/* Veg / Non-Veg Indicator Badge */}
        <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-lg p-1.5 shadow-md flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-700/60">
          <span className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center ${
            isVeg ? 'border-emerald-600' : 'border-rose-600'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
          </span>
          <span className={`text-[11px] font-bold uppercase tracking-wide ${
            isVeg ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
          }`}>
            {post.food_type}
          </span>
        </div>

        {/* Live Expiry Countdown */}
        <div className="absolute top-3 right-3 shadow-md">
          <CountdownTimer 
            expiresAt={post.expires_at} 
            onExpire={() => onExpire && onExpire(post.id)} 
          />
        </div>

        {/* Servings Pill */}
        <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md">
          <Users className="w-3.5 h-3.5 text-brand-400" />
          <span>{post.servings} Servings</span>
        </div>

        {/* Packaging Pill */}
        <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-1">
          <Package className="w-3 h-3 text-slate-500" />
          <span className="capitalize">{post.packaging}</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Donor Info Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                {post.donor_name}
              </span>
              {post.donor_rating && (
                <span className="text-xs text-amber-500 font-semibold flex items-center">
                  ★ {post.donor_rating}
                </span>
              )}
            </div>
            <div className="mt-1">
              <DonorBadge 
                donorType={post.donor_type} 
                isVerified={post.donor_verified || post.donor_verification_status === 'approved'} 
                size="sm" 
              />
            </div>
          </div>

          {post.distance_km !== null && post.distance_km !== undefined && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
              📍 {post.distance_km} km away
            </span>
          )}
        </div>

        {/* Food Item Title */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 mb-2 line-clamp-2 hover:line-clamp-none transition-all">
          {post.food_item}
        </h3>

        {/* Pickup Address */}
        <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400 mb-3">
          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
          <span className="line-clamp-1">{post.pickup_address}</span>
        </div>

        {/* Allergen Chips */}
        {allergens.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-3">
            <span className="text-[11px] font-medium text-slate-500 mr-1">Allergens:</span>
            {allergens.map((alg) => (
              <span
                key={alg}
                className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[10px] font-semibold capitalize"
              >
                {alg}
              </span>
            ))}
          </div>
        )}

        {/* Collapsible Notes */}
        {post.notes && (
          <div className="mb-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <p className={showDetails ? '' : 'line-clamp-2'}>{post.notes}</p>
            {post.notes.length > 100 && (
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="text-brand-600 dark:text-brand-400 text-[11px] font-semibold mt-1 inline-flex items-center gap-0.5 hover:underline"
              >
                {showDetails ? <>Less <ChevronUp className="w-3 h-3" /></> : <>More details <ChevronDown className="w-3 h-3" /></>}
              </button>
            )}
          </div>
        )}

        {/* Mandatory Safety Trust Note */}
        <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/80 mb-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            Check the food is fresh before eating.
          </span>
          <button
            onClick={() => onReport(post)}
            className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors inline-flex items-center gap-1"
            title="Report this post"
          >
            <Flag className="w-3 h-3" />
            <span className="text-[10px]">Report</span>
          </button>
        </div>

        {/* Book Button */}
        <button
          onClick={handleBookClick}
          disabled={isBooking}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2 ${
            isBooking
              ? 'bg-brand-400 cursor-wait text-white'
              : 'bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white hover:shadow-brand-500/25'
          }`}
        >
          {isBooking ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Reserving food...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Book this food</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
