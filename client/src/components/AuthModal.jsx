import React, { useState } from 'react';
import { X, UserPlus, LogIn, Phone, Mail, ShieldAlert, CheckCircle2 } from 'lucide-react';

const DONOR_TYPES = [
  'Hostel / Mess',
  'Restaurant / Cafe',
  'Caterer / Event host',
  'Wedding / Party host',
  'Household / Individual',
  'Company canteen',
  'Other'
];

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess
}) {
  const [mode, setMode] = useState('signup'); // 'signup' | 'login' | 'otp'
  const [role, setRole] = useState('donor'); // 'donor' | 'receiver'
  const [isNgo, setIsNgo] = useState(false);
  const [donorType, setDonorType] = useState('Restaurant / Cafe');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    address: ''
  });

  const [otpCode, setOtpCode] = useState('');
  const [createdUser, setCreatedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role,
          donor_type: role === 'donor' ? donorType : null,
          is_ngo: isNgo
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      setCreatedUser(data.user);

      // If individual donor or individual receiver, prompt for OTP verification
      if (!data.user.is_org) {
        setMode('otp');
      } else {
        alert(data.message);
        onLoginSuccess(data.user);
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: createdUser.id,
          otp: otpCode
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'OTP verification failed');
      }

      alert('Phone verified successfully! Welcome to PlateShare.');
      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: formData.email,
          password: formData.password
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors my-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {mode === 'signup' && <UserPlus className="w-5 h-5 text-brand-600" />}
            {mode === 'login' && <LogIn className="w-5 h-5 text-brand-600" />}
            {mode === 'otp' && <Phone className="w-5 h-5 text-brand-600" />}
            <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
              {mode === 'otp' ? 'Phone OTP Verification' : `${mode} to Plate Share`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Signup Mode */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="mt-4 space-y-3.5">
            {/* Role Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                I am signing up as:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('donor')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    role === 'donor'
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  🥗 Food Donor
                </button>
                <button
                  type="button"
                  onClick={() => setRole('receiver')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    role === 'receiver'
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  🥣 Receiver / NGO
                </button>
              </div>
            </div>

            {/* Donor Type Picker (if donor) */}
            {role === 'donor' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Donor Type *
                </label>
                <select
                  value={donorType}
                  onChange={(e) => setDonorType(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                >
                  {DONOR_TYPES.map((dt) => (
                    <option key={dt} value={dt}>
                      {dt}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Organisations (hostels, cafes, caterers) require admin verification before the badge is granted.
                </p>
              </div>
            )}

            {/* NGO Checkbox (if receiver) */}
            {role === 'receiver' && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={isNgo}
                    onChange={(e) => setIsNgo(e.target.checked)}
                    className="rounded text-brand-600"
                  />
                  <span>We are a registered NGO / Charity organisation</span>
                </label>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Name / Organisation Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sunrise Cafe or Aditi Rao"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Phone (for OTP & Pickup coordination) *
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98000 00000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Address / Pickup Area
              </label>
              <input
                type="text"
                placeholder="e.g. 104 Main Street, Andheri West, Mumbai"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-all mt-2"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <div className="text-center text-xs text-slate-500 pt-2">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-brand-600 font-bold hover:underline"
              >
                Log In
              </button>
            </div>
          </form>
        )}

        {/* Login Mode */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email or Phone *
              </label>
              <input
                type="text"
                required
                placeholder="you@domain.com or +91..."
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-all mt-2"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>

            <div className="text-center text-xs text-slate-500 pt-2">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-brand-600 font-bold hover:underline"
              >
                Sign Up
              </button>
            </div>
          </form>
        )}

        {/* Phone OTP Verification Mode */}
        {mode === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="mt-4 space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 text-xs text-brand-900 dark:text-brand-200">
              <p className="font-bold">Demo Verification Code: 123456</p>
              <p className="text-[11px] mt-1 text-slate-500">
                A 6-digit confirmation code was sent to {createdUser?.phone}.
              </p>
            </div>

            <div>
              <input
                type="text"
                required
                maxLength="6"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-48 text-center text-2xl tracking-widest font-black bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 mx-auto block"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-all"
            >
              {loading ? 'Verifying...' : 'Verify Phone & Start'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
