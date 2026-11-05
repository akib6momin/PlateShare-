import React, { useState, useEffect } from 'react';
import DonorBadge from './DonorBadge';
import CountdownTimer from './CountdownTimer';
import { 
  Plus, 
  RotateCw, 
  CheckCircle2, 
  Trash2, 
  Clock, 
  Users, 
  HeartHandshake, 
  Award, 
  Building2, 
  AlertTriangle, 
  Star,
  ExternalLink 
} from 'lucide-react';

export default function MyPostsView({
  currentUser,
  onOpenPostModal,
  onRepeatLastPost,
  onOpenRatingModal
}) {
  const [posts, setPosts] = useState([]);
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'live' | 'booked' | 'collected' | 'expired'
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDonorData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // 1. Fetch posts
      const pRes = await fetch(`/api/posts/my-posts?donor_id=${currentUser.id}`);
      const pData = await pRes.json();
      if (pData.success) {
        setPosts(pData.posts);
      }

      // 2. Fetch impact summary
      const iRes = await fetch(`/api/impact/summary?donor_id=${currentUser.id}`);
      const iData = await iRes.json();
      if (iData.success) {
        setImpact(iData.summary);
      }
    } catch (err) {
      console.error('Error fetching donor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonorData();
  }, [currentUser]);

  // Mark booked post as collected
  const handleMarkCollected = async (postId) => {
    if (!confirm('Confirm food has been handed over to the receiver?')) return;
    setActionLoading(postId);
    try {
      const res = await fetch(`/api/posts/${postId}/collected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        await fetchDonorData();
        // Trigger rating modal
        const post = posts.find(p => p.id === postId);
        if (post && post.booking_id) {
          onOpenRatingModal({
            booking_id: post.booking_id,
            from_user_id: currentUser.id,
            to_user_id: post.receiver_id || 6,
            target_name: post.receiver_name || 'Receiver',
            direction: 'donor_to_receiver'
          });
        }
      } else {
        alert(data.error || 'Failed to update post');
      }
    } catch (err) {
      alert('Error updating post');
    } finally {
      setActionLoading(null);
    }
  };

  // Remove live post manually
  const handleCancelPost = async (postId) => {
    if (!confirm('Remove this food post from the live feed?')) return;
    setActionLoading(postId);
    try {
      const res = await fetch(`/api/posts/${postId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donor_id: currentUser.id })
      });
      const data = await res.json();
      if (data.success) {
        await fetchDonorData();
      } else {
        alert(data.error || 'Failed to cancel post');
      }
    } catch (err) {
      alert('Error cancelling post');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter posts based on tab
  const filteredPosts = posts.filter(p => {
    if (activeTab === 'all') return true;
    if (activeTab === 'live') return p.effective_status === 'available';
    if (activeTab === 'booked') return p.status === 'booked';
    if (activeTab === 'collected') return p.status === 'collected';
    if (activeTab === 'expired') return p.effective_status === 'expired' || p.status === 'expired';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Donor Header & Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {currentUser?.name}
              </h1>
              <DonorBadge 
                donorType={currentUser?.donor_type} 
                isVerified={currentUser?.verification_status === 'approved'} 
                size="md" 
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage your surplus food donations, mark collections, and track meals saved.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Repeat Last Post Button */}
            <button
              onClick={onRepeatLastPost}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
              title="Autofill form with your last food listing"
            >
              <RotateCw className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>Repeat Last Post</span>
            </button>

            {/* Post Food Button */}
            <button
              onClick={onOpenPostModal}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold shadow-md hover:shadow-brand-500/25 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Post Food</span>
            </button>
          </div>
        </div>

        {/* Impact Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-emerald-900 dark:text-emerald-200">
                {impact?.total_servings_donated || 0}
              </span>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Total Servings Donated
              </p>
            </div>
          </div>

          <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-sky-600 text-white rounded-xl shadow-sm">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-sky-900 dark:text-sky-200">
                {impact?.total_posts || 0}
              </span>
              <p className="text-xs font-semibold text-sky-700 dark:text-sky-400">
                Total Food Posts
              </p>
            </div>
          </div>

          <div className="bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-600 text-white rounded-xl shadow-sm">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-purple-900 dark:text-purple-200">
                {impact?.ngos_helped || 1}
              </span>
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">
                NGOs / Charities Helped
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'All Posts' },
          { id: 'live', label: 'Live' },
          { id: 'booked', label: 'Booked' },
          { id: 'collected', label: 'Collected' },
          { id: 'expired', label: 'Expired & Removed' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              activeTab === tab.id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Post List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Loading posts...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
          <Utensils className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No posts found in this tab
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
            Post surplus meals to connect with nearby NGOs before food spoils.
          </p>
          <button
            onClick={onOpenPostModal}
            className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-md hover:bg-brand-700 transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Food</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPosts.map((post) => {
            const isLive = post.effective_status === 'available';
            const isBooked = post.status === 'booked';
            const isCollected = post.status === 'collected';
            const isExpired = post.effective_status === 'expired' || post.status === 'expired';

            return (
              <div
                key={post.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider text-[10px] font-black border"
                      style={{
                        backgroundColor: isLive ? 'rgba(34, 197, 94, 0.1)' : isBooked ? 'rgba(59, 130, 246, 0.1)' : isCollected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderColor: isLive ? 'rgba(34, 197, 94, 0.3)' : isBooked ? 'rgba(59, 130, 246, 0.3)' : isCollected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                        color: isLive ? '#15803d' : isBooked ? '#1d4ed8' : isCollected ? '#047857' : '#b91c1c'
                      }}
                    >
                      {isLive && '🟢 Live on Feed'}
                      {isBooked && '🔵 Booked (Awaiting Pickup)'}
                      {isCollected && '✅ Collected & Saved'}
                      {isExpired && '⚠️ Expired and removed'}
                    </span>

                    {/* Expiry / Countdown */}
                    {isLive && (
                      <CountdownTimer 
                        expiresAt={post.expires_at} 
                        onExpire={fetchDonorData}
                      />
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                    {post.food_item}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {post.servings} servings
                    </span>
                    <span>•</span>
                    <span className="capitalize">{post.food_type}</span>
                    <span>•</span>
                    <span className="capitalize">{post.packaging}</span>
                  </div>

                  {/* Booked Info */}
                  {isBooked && (
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 mb-3">
                      <p className="font-bold">Booked by:</p>
                      <p className="text-sm font-extrabold">{post.receiver_name}</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                        📞 Phone: <a href={`tel:${post.receiver_phone}`} className="underline font-bold">{post.receiver_phone}</a>
                      </p>
                    </div>
                  )}

                  {/* Expired and removed label requirement */}
                  {isExpired && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 mb-3">
                      <p className="font-bold">Expired and removed</p>
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                        Expired at {new Date(post.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Will be permanently archived during next cleanup.
                      </p>
                    </div>
                  )}
                </div>

                {/* Post Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    Posted: {new Date(post.posted_at || post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Mark Collected Action */}
                    {isBooked && (
                      <button
                        onClick={() => handleMarkCollected(post.id)}
                        disabled={actionLoading === post.id}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark as Collected</span>
                      </button>
                    )}

                    {/* Cancel Live Post Action */}
                    {isLive && (
                      <button
                        onClick={() => handleCancelPost(post.id)}
                        disabled={actionLoading === post.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Post</span>
                      </button>
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
