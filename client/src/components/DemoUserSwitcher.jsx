import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  ShieldCheck, 
  Building2, 
  UtensilsCrossed, 
  ChefHat, 
  Home, 
  Briefcase, 
  ShoppingBag, 
  KeyRound, 
  CheckCircle2, 
  PlusCircle 
} from 'lucide-react';
import DonorBadge from './DonorBadge';

export default function DemoUserSwitcher({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  onOpenAuthModal
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/auth/users')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUsers(data.users);
          }
        })
        .catch(err => console.error('Error fetching users:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const donors = users.filter(u => u.role === 'donor');
  const receivers = users.filter(u => u.role === 'receiver');
  const admins = users.filter(u => u.role === 'admin');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />
              Switch Persona / Test Role
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Instant 1-click test login for all seeded platform entities.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Loading test users...
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Donors Section */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 block">
                Food Donors (Post surplus meals)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {donors.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSelectUser(u);
                        onClose();
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isCurrent
                          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-2 ring-brand-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {u.name}
                        </span>
                        {isCurrent && (
                          <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0"></span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <DonorBadge donorType={u.donor_type} isVerified={u.verification_status === 'approved'} size="sm" />
                        {u.verification_status === 'pending' && (
                          <span className="text-[10px] font-black text-amber-600 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                            Pending Admin
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Receivers Section */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 block">
                Food Receivers (NGOs, Charities & People in Need)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {receivers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSelectUser(u);
                        onClose();
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isCurrent
                          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-2 ring-brand-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {u.name}
                        </span>
                        {isCurrent && (
                          <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0"></span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {u.is_org ? '🏛️ NGO / Charity' : '👤 Individual in Need'}
                        </span>
                        {u.verification_status === 'approved' && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                            Verified
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Admin Section */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 block">
                PlateShare Admin
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {admins.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSelectUser(u);
                        onClose();
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          🛡️ {u.name} (Admin Operations)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Approves organizations, resolves food safety reports & manages cron cleanup
                        </span>
                      </div>
                      {isCurrent && (
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Active</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Account Registration CTA */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Want to test custom signup with OTP verification?
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-all flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create New Account</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
