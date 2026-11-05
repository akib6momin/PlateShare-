import React from 'react';
import { 
  Building2, 
  UtensilsCrossed, 
  ChefHat, 
  Sparkles, 
  Home, 
  Briefcase, 
  Package, 
  ShieldCheck 
} from 'lucide-react';

export const DONOR_TYPE_CONFIG = {
  'Hostel / Mess': {
    icon: Building2,
    label: 'Hostel / Mess',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800'
  },
  'Restaurant / Cafe': {
    icon: UtensilsCrossed,
    label: 'Restaurant / Cafe',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800'
  },
  'Caterer / Event host': {
    icon: ChefHat,
    label: 'Caterer / Event',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800'
  },
  'Wedding / Party host': {
    icon: Sparkles,
    label: 'Wedding / Party',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800'
  },
  'Household / Individual': {
    icon: Home,
    label: 'Household / Home',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800'
  },
  'Company canteen': {
    icon: Briefcase,
    label: 'Company Canteen',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800'
  },
  'Other': {
    icon: Package,
    label: 'Other Donor',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700'
  }
};

export default function DonorBadge({ donorType, isVerified, size = 'sm' }) {
  const config = DONOR_TYPE_CONFIG[donorType] || DONOR_TYPE_CONFIG['Other'];
  const IconComponent = config.icon;

  const isSmall = size === 'sm';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Donor Type Badge */}
      <span className={`inline-flex items-center gap-1 font-semibold rounded-full border ${config.bg} ${config.text} ${config.border} ${isSmall ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}>
        <IconComponent className={isSmall ? "w-3.5 h-3.5" : "w-4 h-4"} />
        <span>{config.label}</span>
      </span>

      {/* Verified Organisation Badge */}
      {Boolean(isVerified) && (
        <span 
          title="Verified Organisation" 
          className={`inline-flex items-center gap-1 rounded-full bg-emerald-100/90 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-medium ${isSmall ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'}`}
        >
          <ShieldCheck className={isSmall ? "w-3 h-3 text-emerald-600 dark:text-emerald-400" : "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"} />
          <span>Verified Org</span>
        </span>
      )}
    </div>
  );
}
