import React, { useState, useEffect } from 'react';
import { 
  X, 
  Utensils, 
  Users, 
  Package, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Image, 
  Info,
  Sparkles
} from 'lucide-react';
import { DONOR_TYPE_CONFIG } from './DonorBadge';

const ALLERGEN_OPTIONS = [
  'dairy',
  'nuts',
  'gluten',
  'egg',
  'soy',
  'peanuts',
  'sesame',
  'fish/seafood'
];

// Curated high quality food presets for quick photo selection
const PHOTO_PRESETS = [
  { label: 'Veg Thali Meal', url: 'https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=600&q=80' },
  { label: 'Dal & Rice', url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80' },
  { label: 'Biryani Feast', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80' },
  { label: 'Fresh Sandwiches', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80' },
  { label: 'Snack & Fruit Box', url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80' },
  { label: 'Curry & Flatbread', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80' }
];

export default function PostFoodModal({
  isOpen,
  onClose,
  currentUser,
  onPostCreated,
  initialData = null
}) {
  const [formData, setFormData] = useState({
    food_item: '',
    servings: 20,
    food_type: 'veg',
    packaging: 'packed',
    pickup_address: currentUser?.address || '',
    contact_phone: currentUser?.phone || '',
    notes: '',
    photo_url: '',
    safe_duration_hours: 2, // Default 2 hours
    cooked_at: '',
    allergens: [],
    freshness_confirmed: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Populate or pre-fill with initialData if "Repeat last post" was triggered
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        food_item: initialData.food_item || '',
        servings: initialData.servings || 20,
        food_type: initialData.food_type || 'veg',
        packaging: initialData.packaging || 'packed',
        pickup_address: initialData.pickup_address || currentUser?.address || '',
        contact_phone: initialData.contact_phone || currentUser?.phone || '',
        notes: initialData.notes || '',
        photo_url: initialData.photo_url || '',
        safe_duration_hours: initialData.safe_duration_hours || 2,
        allergens: initialData.allergens || [],
        freshness_confirmed: false
      }));
    } else if (currentUser) {
      setFormData(prev => ({
        ...prev,
        pickup_address: currentUser.address || '',
        contact_phone: currentUser.phone || ''
      }));
    }
  }, [initialData, currentUser]);

  // Prompt rule: "shorter default durations for risky foods (for example, non-veg or dairy-based items default to 2 hours)."
  useEffect(() => {
    if (formData.food_type === 'non-veg' || formData.allergens.includes('dairy')) {
      if (formData.safe_duration_hours > 2 && formData.safe_duration_hours !== 0.0333) {
        setFormData(prev => ({ ...prev, safe_duration_hours: 2 }));
      }
    }
  }, [formData.food_type, formData.allergens]);

  if (!isOpen) return null;

  const handleAllergenToggle = (allergen) => {
    setFormData(prev => {
      const exists = prev.allergens.includes(allergen);
      return {
        ...prev,
        allergens: exists
          ? prev.allergens.filter(a => a !== allergen)
          : [...prev.allergens, allergen]
      };
    });
  };

  // Calculate live preview of expires_at
  const calculateExpiryPreview = () => {
    const durationHours = parseFloat(formData.safe_duration_hours || 2);
    let baseDate = new Date();
    if (formData.cooked_at) {
      const parsed = new Date(formData.cooked_at);
      if (!isNaN(parsed.getTime())) {
        baseDate = parsed;
      }
    }
    const expiresAt = new Date(baseDate.getTime() + durationHours * 3600000);
    return expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
           ' (' + expiresAt.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.freshness_confirmed) {
      setError('Please check the freshness pledge to confirm the food is safe to eat.');
      return;
    }

    if (parseFloat(formData.safe_duration_hours) > 6) {
      setError('Safe-to-eat duration cannot exceed the 6-hour safety limit.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          donor_id: currentUser.id,
          donor_name: currentUser.name,
          donor_type: currentUser.donor_type || 'Household / Individual',
          servings: parseInt(formData.servings, 10),
          safe_duration_hours: parseFloat(formData.safe_duration_hours),
          cooked_at: formData.cooked_at ? new Date(formData.cooked_at).toISOString() : null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to post food');
      }

      onPostCreated(data.post);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 transition-colors max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Utensils className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              Post Surplus Food
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Posting as <span className="font-bold text-slate-700 dark:text-slate-300">{currentUser?.name}</span> ({currentUser?.donor_type})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Food Item Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Food Item / Dish Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 30 Portions Dal Makhani & Roti, 20 Rice Bowls, Fresh Fruit Trays"
              value={formData.food_item}
              onChange={(e) => setFormData({ ...formData, food_item: e.target.value })}
              className="w-full text-sm font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Servings & Dietary & Packaging (3 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Number of Servings */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Servings (People) *
              </label>
              <input
                type="number"
                required
                min="1"
                max="1000"
                value={formData.servings}
                onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                className="w-full text-sm font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Food Type (Veg / Non-Veg) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Food Type *
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {['veg', 'non-veg'].map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setFormData({ ...formData, food_type: type })}
                    className={`text-xs font-bold py-2.5 rounded-xl border capitalize transition-all ${
                      formData.food_type === type
                        ? type === 'veg'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Packaging */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                Packaging *
              </label>
              <select
                value={formData.packaging}
                onChange={(e) => setFormData({ ...formData, packaging: e.target.value })}
                className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="packed">Packed (Ready to take)</option>
                <option value="open">Open (Platters/Buffet)</option>
                <option value="needs containers">Needs Containers</option>
              </select>
            </div>
          </div>

          {/* Time & Expiry Calculation Section */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                Freshness & Expiry Calculation
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Max 6h limit
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Optional Cooked At Time */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cooked At (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.cooked_at}
                  onChange={(e) => setFormData({ ...formData, cooked_at: e.target.value })}
                  className="w-full text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Food cooked earlier gets less time remaining.
                </p>
              </div>

              {/* Safe to Eat Duration Buttons */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Safe To Eat For *
                </label>
                <div className="grid grid-cols-6 gap-1">
                  {[
                    { val: 0.0333, label: '2 min (Test)' },
                    { val: 1, label: '1 hr' },
                    { val: 2, label: '2 hrs (Safe)' },
                    { val: 3, label: '3 hrs' },
                    { val: 4, label: '4 hrs' },
                    { val: 6, label: '6 hrs (Max)' }
                  ].map((d) => {
                    const isSelected = formData.safe_duration_hours === d.val;
                    return (
                      <button
                        type="button"
                        key={d.label}
                        onClick={() => setFormData({ ...formData, safe_duration_hours: d.val })}
                        className={`text-[11px] font-bold py-2 px-1 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Calculated Expiry Banner */}
            <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 flex items-center justify-between text-xs">
              <span className="font-semibold text-brand-900 dark:text-brand-300">
                Calculated Expiry:
              </span>
              <span className="font-extrabold text-brand-700 dark:text-brand-400">
                {calculateExpiryPreview()}
              </span>
            </div>
          </div>

          {/* Allergen Checkboxes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Allergens (Check all that apply)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALLERGEN_OPTIONS.map((alg) => {
                const checked = formData.allergens.includes(alg);
                return (
                  <button
                    type="button"
                    key={alg}
                    onClick={() => handleAllergenToggle(alg)}
                    className={`text-xs font-semibold py-2 px-3 rounded-xl border text-left capitalize transition-all flex items-center justify-between ${
                      checked
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{alg}</span>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[10px] ${
                      checked ? 'bg-amber-600 text-white border-amber-600' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {checked ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pickup Address & Contact Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Pickup Address *
              </label>
              <input
                type="text"
                required
                value={formData.pickup_address}
                onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Contact Phone for Receiver *
              </label>
              <input
                type="text"
                required
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Photo Presets & Custom URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Image className="w-3.5 h-3.5 text-slate-400" />
                Food Photo (Preset or URL)
              </span>
              <span className="text-[10px] text-slate-400">Click a preset or paste link</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PHOTO_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.label}
                  onClick={() => setFormData({ ...formData, photo_url: p.url })}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                    formData.photo_url === p.url
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="url"
              placeholder="https://..."
              value={formData.photo_url}
              onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Optional Notes / Pickup Instructions
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Please bring clean vessels. Come through back entrance, gate 3."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            ></textarea>
          </div>

          {/* Mandatory Freshness Pledge */}
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={formData.freshness_confirmed}
                onChange={(e) => setFormData({ ...formData, freshness_confirmed: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
              />
              <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                Safety Pledge: "I confirm this food was freshly prepared, stored in hygienic conditions, and is safe to eat."
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md transition-all flex items-center gap-2"
            >
              {loading ? 'Posting...' : 'Publish Food Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
