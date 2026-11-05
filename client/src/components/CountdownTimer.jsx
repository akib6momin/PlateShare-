import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export default function CountdownTimer({ expiresAt, onExpire, isExpiredStatus = false }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (isExpiredStatus) {
      setTimeLeft(0);
      return;
    }

    const checkTime = () => {
      const target = new Date(expiresAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, target - now);

      setTimeLeft(diff);

      if (diff <= 0) {
        if (onExpire) {
          onExpire();
        }
      }
    };

    checkTime();
    const timer = setInterval(checkTime, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire, isExpiredStatus]);

  if (timeLeft === null) return null;

  if (timeLeft <= 0 || isExpiredStatus) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Expired</span>
      </div>
    );
  }

  const totalSeconds = Math.floor(timeLeft / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const isUrgent = totalSeconds < 1800; // Under 30 minutes (< 1800s)

  let formatted = '';
  if (hours > 0) {
    formatted = `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  } else {
    formatted = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
        isUrgent
          ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-2 border-amber-400 dark:border-amber-500 shadow-sm shadow-amber-200 dark:shadow-none animate-pulse-subtle'
          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
      }`}
    >
      {isUrgent ? (
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-bounce" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      )}
      <span>{formatted} safe</span>
      {isUrgent && (
        <span className="ml-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white px-1.5 py-0.2 rounded-full">
          Soon!
        </span>
      )}
    </div>
  );
}
