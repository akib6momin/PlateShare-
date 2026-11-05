import React from 'react';
import { 
  UtensilsCrossed, 
  Sun, 
  Moon, 
  Bell, 
  Plus, 
  User, 
  ShieldCheck, 
  ShoppingBag, 
  SlidersHorizontal,
  ChevronDown 
} from 'lucide-react';
import DonorBadge from './DonorBadge';

export default function Header({
  currentUser,
  activeView,
  setActiveView,
  isDarkMode,
  setIsDarkMode,
  unreadCount,
  onOpenNotifications,
  onOpenPostModal,
  onOpenAuthModal,
  onOpenUserSwitcher
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveView('feed')} 
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
              Plate<span className="text-brand-600 dark:text-brand-400">Share</span>
            </span>
            <span className="text-[10px] block font-semibold text-slate-400 dark:text-slate-500 -mt-1 tracking-wider uppercase">
              Surplus Food Rescue
            </span>
          </div>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold">
          <button
            onClick={() => setActiveView('feed')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeView === 'feed'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Surplus Feed
          </button>

          {currentUser?.role === 'donor' && (
            <button
              onClick={() => setActiveView('my-posts')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeView === 'my-posts'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              My Posts
            </button>
          )}

          {currentUser?.role === 'receiver' && (
            <button
              onClick={() => setActiveView('my-bookings')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeView === 'my-bookings'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              My Bookings
            </button>
          )}

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveView('admin')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeView === 'admin'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Admin Center
            </button>
          )}
        </nav>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Post Food Button (for donors or any user wanting to donate) */}
          <button
            onClick={onOpenPostModal}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md hover:shadow-brand-500/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Donate Food</span>
          </button>

          {/* Quick Demo Role Switcher Button */}
          <button
            onClick={onOpenUserSwitcher}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all"
            title="Switch demo persona or test accounts"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline">Role:</span>
            <span className="font-extrabold text-brand-600 dark:text-brand-400 truncate max-w-[100px] sm:max-w-none">
              {currentUser ? currentUser.name.split(' ')[0] : 'Guest'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="In-app notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
