import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Trash2, 
  RefreshCw, 
  FileText, 
  CheckSquare, 
  Flame, 
  Terminal 
} from 'lucide-react';
import DonorBadge from './DonorBadge';

export default function AdminDashboard({ currentUser }) {
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [cronLogs, setCronLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('verifications'); // 'verifications' | 'reports' | 'cron'
  const [cronResult, setCronResult] = useState(null);
  const [cronRunning, setCronRunning] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch system stats
      const sRes = await fetch('/api/admin/system-stats');
      const sData = await sRes.json();
      if (sData.success) setStats(sData.stats);

      // 2. Fetch pending users
      const pRes = await fetch('/api/admin/pending-users');
      const pData = await pRes.json();
      if (pData.success) setPendingUsers(pData.pending);

      // 3. Fetch reports
      const rRes = await fetch('/api/admin/reports');
      const rData = await rRes.json();
      if (rData.success) setReports(rData.reports);

      // 4. Fetch cron logs
      const cRes = await fetch('/api/admin/cron-logs');
      const cData = await cRes.json();
      if (cData.success) setCronLogs(cData.logs);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Approve / Reject Organization or NGO
  const handleVerifyUser = async (userId, action) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchAdminData();
      } else {
        alert(data.error || 'Failed to update user');
      }
    } catch (err) {
      alert('Error verifying user');
    }
  };

  // Resolve / Dismiss Report
  const handleResolveReport = async (reportId, action) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchAdminData();
      } else {
        alert(data.error || 'Failed to resolve report');
      }
    } catch (err) {
      alert('Error resolving report');
    }
  };

  // Trigger Stage 2 Expiry Check
  const handleTriggerStage2 = async () => {
    setCronRunning(true);
    setCronResult(null);
    try {
      const res = await fetch('/api/admin/cron/expire', { method: 'POST' });
      const data = await res.json();
      setCronResult({ stage: 2, ...data.result });
      fetchAdminData();
    } catch (err) {
      alert('Error triggering Stage 2 check');
    } finally {
      setCronRunning(false);
    }
  };

  // Trigger Stage 3 Cleanup Check (Test mode 5 minutes or 24 hours)
  const handleTriggerStage3 = async (retentionMinutes) => {
    setCronRunning(true);
    setCronResult(null);
    try {
      const res = await fetch('/api/admin/cron/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionMinutes })
      });
      const data = await res.json();
      setCronResult({ stage: 3, ...data.result });
      fetchAdminData();
    } catch (err) {
      alert('Error triggering Stage 3 cleanup');
    } finally {
      setCronRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                Admin Operations Center
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review pending organisations, resolve reports, and inspect background cron jobs.
            </p>
          </div>

          <button
            onClick={fetchAdminData}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* System Overview Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
              Pending Approvals
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats?.pending_verifications || 0}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
              Open Reports
            </span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {stats?.open_reports || 0}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
              Live Feed Posts
            </span>
            <span className="text-2xl font-black text-brand-600 dark:text-brand-400">
              {stats?.live_available_posts || 0}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
              Servings Rescued
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats?.total_servings_saved || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('verifications')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            activeTab === 'verifications'
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Pending Verifications ({pendingUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            activeTab === 'reports'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Reported Posts ({reports.filter(r => r.status === 'open').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cron')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            activeTab === 'cron'
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Auto-Expiry & Deletion Testing Console</span>
        </button>
      </div>

      {/* Tab 1: Organization & NGO Verifications */}
      {activeTab === 'verifications' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Organisations Awaiting Verification
          </h2>

          {pendingUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
              <p className="text-xs text-slate-400">No organizations or NGOs are pending verification right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((u) => (
                <div
                  key={u.id}
                  className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {u.name}
                      </span>
                      <DonorBadge donorType={u.donor_type || 'Other'} isVerified={false} size="sm" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      📧 {u.email} • 📞 {u.phone}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      📍 {u.address}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerifyUser(u.id, 'approve')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve & Grant Badge</span>
                    </button>
                    <button
                      onClick={() => handleVerifyUser(u.id, 'reject')}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900 transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Reported Posts & Safety */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Food Safety & Community Reports
            </h2>
            <span className="text-xs text-slate-500">
              * Posts with 3+ reports are auto-hidden from feed. Posts with open reports are protected from cleanup.
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No reports on record</p>
              <p className="text-xs text-slate-400">All community listings are in good standing.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((r) => {
                const isOpen = r.status === 'open';
                return (
                  <div
                    key={r.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isOpen 
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60' 
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isOpen 
                              ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200' 
                              : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {r.status}
                          </span>
                          <span className="text-xs font-bold text-rose-700 dark:text-rose-400 capitalize">
                            Reason: {r.reason}
                          </span>
                          {r.is_flagged === 1 && (
                            <span className="text-[10px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                              AUTO-HIDDEN (3+ Reports)
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            Post #{r.post_id}: "{r.food_item}" ({r.servings} servings)
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Donor: <span className="font-semibold text-slate-700 dark:text-slate-300">{r.donor_name}</span> ({r.donor_phone})
                          </p>
                        </div>

                        {r.details && (
                          <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-semibold">Reporter statement: </span> "{r.details}"
                          </div>
                        )}

                        <p className="text-[11px] text-slate-400">
                          Reported by {r.reporter_name} at {new Date(r.created_at).toLocaleString()}
                        </p>
                      </div>

                      {isOpen && (
                        <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
                          <button
                            onClick={() => handleResolveReport(r.id, 'dismiss')}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                          >
                            Dismiss Report
                          </button>
                          <button
                            onClick={() => handleResolveReport(r.id, 'take_down')}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Take Down Post</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Expiry & Cleanup Testing Console */}
      {activeTab === 'cron' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Automatic Expiry & Permanent Deletion Test Console
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Test and verify the 3 automatic expiry stages on demand without waiting for minute/hour crons.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Trigger Stage 2 Card */}
              <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                    Stage 2 (Normally every 1m)
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2 mb-1">
                    Mark Expired & Notify
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                    Scans for available posts past expires_at and changes status to 'expired'. Also expires uncollected bookings and sends alerts.
                  </p>
                </div>
                <button
                  onClick={handleTriggerStage2}
                  disabled={cronRunning}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  <span>Run Stage 2 Expiry Check Now</span>
                </button>
              </div>

              {/* Trigger Stage 3 Card */}
              <div className="p-5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-full">
                    Stage 3 (Normally every 1h)
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2 mb-1">
                    Permanent Cleanup & Impact Archive
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                    Archives summary row to impact_summaries and permanently purges posts expired older than retention threshold. Protects posts with open reports!
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleTriggerStage3(5)}
                    disabled={cronRunning}
                    className="py-2.5 px-3 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all flex items-center justify-center gap-1.5"
                    title="Test mode: cleans posts expired > 5 minutes ago"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Test 5-Min Cleanup</span>
                  </button>
                  <button
                    onClick={() => handleTriggerStage3(1440)}
                    disabled={cronRunning}
                    className="py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition-all flex items-center justify-center gap-1.5"
                    title="Standard mode: cleans posts expired > 24 hours ago"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Run 24-Hr Cleanup</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Cron Result Console */}
            {cronResult && (
              <div className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs border border-slate-800 space-y-2 mb-6">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span>Execution Output (Stage {cronResult.stage})</span>
                  <span>{cronResult.timestamp}</span>
                </div>
                <p>Items Processed/Deleted: <span className="font-bold text-white">{cronResult.affectedCount || cronResult.deletedCount || 0}</span></p>
                {cronResult.skippedCount !== undefined && (
                  <p>Preserved (Open Reports Guard): <span className="font-bold text-amber-300">{cronResult.skippedCount}</span></p>
                )}
                {cronResult.logs && cronResult.logs.length > 0 && (
                  <ul className="list-disc pl-4 space-y-1 text-slate-300">
                    {cronResult.logs.map((log, idx) => (
                      <li key={idx}>{log}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Test Checklist Box requested in deliverables */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/80">
              <h3 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 mb-3">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Auto-Expiry & Deletion Test Checklist
              </h3>
              <ol className="space-y-2 text-xs text-emerald-900 dark:text-emerald-300 list-decimal pl-4">
                <li>
                  <strong>Verify Stage 1 (Instant Hide):</strong> Look at the 2-minute test post (#6 "10 Snack Packs"). The moment the client timer reaches 00m 00s, it instantly vanishes from the screen. A refresh will not return it because the server strictly queries <code>expires_at &gt; now</code>.
                </li>
                <li>
                  <strong>Verify Stage 2 (Mark Expired):</strong> Click <em>"Run Stage 2 Expiry Check Now"</em> (or wait 1 min). Post #6 is marked status = 'expired'. The donor now sees it in "My Posts" labelled <em>"Expired and removed"</em>.
                </li>
                <li>
                  <strong>Verify Stage 3 (Permanent Deletion & Impact Preservation):</strong> Click <em>"Test 5-Min Cleanup"</em>. Posts expired &gt; 5 mins ago (such as seeded Post #5) are permanently removed from <code>food_posts</code>, and an anonymous summary row is saved to <code>impact_summaries</code> so servings and impact totals are preserved forever!
                </li>
                <li>
                  <strong>Verify Report Protection Guard:</strong> If a post has an open report, it will be skipped by Stage 3 until the admin resolves the report.
                </li>
              </ol>
            </div>
          </div>

          {/* Cron Logs Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Background Cron Run History
            </h3>
            {cronLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No cron logs recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-[10px] text-slate-500">
                    <tr>
                      <th className="p-3">Job Type</th>
                      <th className="p-3">Details</th>
                      <th className="p-3">Items Affected</th>
                      <th className="p-3">Executed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cronLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-semibold text-slate-900 dark:text-white capitalize">
                          {log.job_type.replace('_', ' ')}
                        </td>
                        <td className="p-3 font-mono text-[11px] max-w-md truncate" title={log.details}>
                          {log.details}
                        </td>
                        <td className="p-3 font-bold text-brand-600">
                          {log.items_affected}
                        </td>
                        <td className="p-3 text-slate-400">
                          {new Date(log.executed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
