import React from 'react';
import { Filter, RotateCcw, MapPin, Users, Utensils } from 'lucide-react';
import { DONOR_TYPE_CONFIG } from './DonorBadge';

const DONOR_TYPES = [
  'All',
  'Hostel / Mess',
  'Restaurant / Cafe',
  'Caterer / Event host',
  'Wedding / Party host',
  'Household / Individual',
  'Company canteen',
  'Other'
];

export default function FiltersBar({
  filters,
  onChange,
  onReset,
  totalAvailable
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-brand-50 dark:bg-brand-950/60 rounded-xl text-brand-600 dark:text-brand-400">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Available Surplus Food
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-800 dark:text-brand-300 font-extrabold">
                {totalAvailable} Live
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sorted by soonest expiry. Claim before time runs out.
            </p>
          </div>
        </div>

        {/* Clear Filters Button */}
        <button
          onClick={onReset}
          className="self-start md:self-auto text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Filters
        </button>
      </div>

      {/* Filter Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        {/* Donor Type Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Donor Type
          </label>
          <select
            value={filters.donor_type || 'all'}
            onChange={(e) => onChange('donor_type', e.target.value === 'all' ? '' : e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Donor Types</option>
            {DONOR_TYPES.filter(t => t !== 'All').map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Veg / Non-Veg Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Dietary Preference
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: '', label: 'All' },
              { id: 'veg', label: 'Veg' },
              { id: 'non-veg', label: 'Non-Veg' }
            ].map(opt => {
              const active = (filters.food_type || '') === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onChange('food_type', opt.id)}
                  className={`text-xs font-bold py-2 rounded-xl transition-all border ${
                    active
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Minimum Servings Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Min Servings</span>
            <span className="text-brand-600 dark:text-brand-400 font-extrabold">{filters.min_servings || 0}+</span>
          </label>
          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={filters.min_servings || 0}
            onChange={(e) => onChange('min_servings', parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600 mt-2"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>Any</span>
            <span>20+</span>
            <span>50+</span>
          </div>
        </div>

        {/* Max Distance Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Radius
            </span>
            <span className="text-brand-600 dark:text-brand-400 font-extrabold">
              {filters.max_distance ? `${filters.max_distance} km` : 'Any Distance'}
            </span>
          </label>
          <select
            value={filters.max_distance || ''}
            onChange={(e) => onChange('max_distance', e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Any distance</option>
            <option value="5">Within 5 km</option>
            <option value="10">Within 10 km</option>
            <option value="25">Within 25 km</option>
            <option value="50">Within 50 km</option>
          </select>
        </div>
      </div>
    </div>
  );
}
