import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FoodCard from './components/FoodCard';
import FiltersBar from './components/FiltersBar';
import PostFoodModal from './components/PostFoodModal';
import MyPostsView from './components/MyPostsView';
import MyBookingsView from './components/MyBookingsView';
import AdminDashboard from './components/AdminDashboard';
import NotificationsDrawer from './components/NotificationsDrawer';
import DemoUserSwitcher from './components/DemoUserSwitcher';
import ReportModal from './components/ReportModal';
import RatingModal from './components/RatingModal';
import AuthModal from './components/AuthModal';
import DonorBadge from './components/DonorBadge';

import { 
  UtensilsCrossed, 
  Plus, 
  ShoppingBag, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle, 
  HeartHandshake, 
  Layers, 
  Bell 
} from 'lucide-react';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('plateshare_theme') === 'dark';
  });

  // Current active user
  const [currentUser, setCurrentUser] = useState(null);

  // Active view: 'feed' | 'my-posts' | 'my-bookings' | 'admin'
  const [activeView, setActiveView] = useState('feed');

  // Posts Feed state
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Filters state
  const [filters, setFilters] = useState({
    donor_type: '',
    food_type: '',
    min_servings: 0,
    max_distance: '',
    user_lat: 19.0760, // Default demo location: Mumbai central
    user_lng: 72.8777
  });

  // Notifications & Unread state
  const [unreadCount, setUnreadCount] = useState(0);

  // Modals state
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postInitialData, setPostInitialData] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userSwitcherOpen, setUserSwitcherOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [reportingPost, setReportingPost] = useState(null);
  const [ratingData, setRatingData] = useState(null);

  // Manage Dark Mode class on <html>
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('plateshare_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('plateshare_theme', 'light');
    }
  }, [isDarkMode]);

  // Initial user initialization: load last used or default to Hope Community Kitchen (NGO)
  useEffect(() => {
    const savedUserId = localStorage.getItem('plateshare_user_id');
    fetch('/api/auth/users')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.users.length > 0) {
          let userToSelect = data.users[0];
          if (savedUserId) {
            const found = data.users.find(u => u.id === parseInt(savedUserId, 10));
            if (found) userToSelect = found;
          } else {
            // Default to NGO receiver (Hope Community Kitchen)
            const ngo = data.users.find(u => u.name.includes('Hope'));
            if (ngo) userToSelect = ngo;
          }
          setCurrentUser(userToSelect);
        }
      })
      .catch(err => console.error('Error bootstrapping users:', err));
  }, []);

  // Poll / fetch unread notifications count
  const fetchUnreadCount = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications?user_id=${currentUser.id}`);
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.unread_count || 0);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch available feed posts
  const fetchFeedPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const params = new URLSearchParams();
      if (filters.donor_type) params.append('donor_type', filters.donor_type);
      if (filters.food_type) params.append('food_type', filters.food_type);
      if (filters.min_servings > 0) params.append('min_servings', filters.min_servings);
      if (filters.max_distance) {
        params.append('max_distance', filters.max_distance);
        params.append('user_lat', filters.user_lat);
        params.append('user_lng', filters.user_lng);
      }

      const res = await fetch(`/api/posts?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('Error fetching feed posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchFeedPosts();
  }, [fetchFeedPosts]);

  // Handle client-side immediate hide when post expires
  const handleClientSideExpire = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  // Booking action with double booking race condition handling
  const handleBookFood = async (post) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: post.id,
          receiver_id: currentUser.id,
          receiver_name: currentUser.name,
          receiver_phone: currentUser.phone
        })
      });

      const data = await res.json();

      if (res.status === 409) {
        // Race condition: already booked by someone else!
        alert('⚠️ Already booked! Another receiver claimed this food just now.');
        fetchFeedPosts();
        return;
      }

      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to book listing');
        return;
      }

      alert(`🎉 Food Booked Successfully!\nPickup Address: ${data.pickup_address}\nDonor Phone: ${data.donor_contact}`);

      // Instantly remove from local feed
      setPosts(prev => prev.filter(p => p.id !== post.id));

      // Refresh notifications & switch to My Bookings
      fetchUnreadCount();
      setActiveView('my-bookings');
    } catch (err) {
      alert('Error processing booking');
    }
  };

  // Switch persona handler
  const handleSelectUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem('plateshare_user_id', user.id);
    if (user.role === 'admin') {
      setActiveView('admin');
    } else if (user.role === 'donor') {
      setActiveView('my-posts');
    } else {
      setActiveView('feed');
    }
  };

  // "Repeat last post" button handler
  const handleRepeatLastPost = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/posts/last?donor_id=${currentUser.id}`);
      const data = await res.json();
      if (data.success && data.post) {
        setPostInitialData(data.post);
        setPostModalOpen(true);
      } else {
        alert('No previous post found to repeat. Creating a new one!');
        setPostInitialData(null);
        setPostModalOpen(true);
      }
    } catch (err) {
      setPostInitialData(null);
      setPostModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors pb-20 md:pb-10">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        activeView={activeView}
        setActiveView={setActiveView}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        unreadCount={unreadCount}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenPostModal={() => {
          setPostInitialData(null);
          setPostModalOpen(true);
        }}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onOpenUserSwitcher={() => setUserSwitcherOpen(true)}
      />

      {/* Role Switcher Floating Quick-Bar */}
      <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border-b border-emerald-200/80 dark:border-emerald-800/60 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-800 dark:text-emerald-300">
              Active Session:
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {currentUser?.name}
            </span>
            <DonorBadge 
              donorType={currentUser?.donor_type || (currentUser?.role === 'receiver' ? 'Other' : 'Other')} 
              isVerified={currentUser?.verification_status === 'approved'} 
              size="sm" 
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setUserSwitcherOpen(true)}
              className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1"
            >
              <span>Switch persona / demo role</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1 w-full">
        {/* VIEW 1: Surplus Food Feed (Receiver / Public) */}
        {activeView === 'feed' && (
          <div>
            {/* Filter Bar */}
            <FiltersBar
              filters={filters}
              onChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))}
              onReset={() => setFilters({
                donor_type: '',
                food_type: '',
                min_servings: 0,
                max_distance: '',
                user_lat: 19.0760,
                user_lng: 72.8777
              })}
              totalAvailable={posts.length}
            />

            {/* Food Posts Grid */}
            {loadingPosts ? (
              <div className="py-24 text-center text-sm text-slate-400">
                <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                Checking live kitchen surplus...
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm max-w-lg mx-auto">
                <UtensilsCrossed className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No food available right now
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                  Check back soon or post surplus meals if you have leftovers from an event, restaurant, or hostel.
                </p>
                <button
                  onClick={() => {
                    setPostInitialData(null);
                    setPostModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-md hover:bg-brand-700 transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Donate Food</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <FoodCard
                    key={post.id}
                    post={post}
                    currentUser={currentUser}
                    onBook={handleBookFood}
                    onReport={(p) => setReportingPost(p)}
                    onExpire={handleClientSideExpire}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: Donor's "My Posts" Page */}
        {activeView === 'my-posts' && (
          <MyPostsView
            currentUser={currentUser}
            onOpenPostModal={() => {
              setPostInitialData(null);
              setPostModalOpen(true);
            }}
            onRepeatLastPost={handleRepeatLastPost}
            onOpenRatingModal={(data) => setRatingData(data)}
          />
        )}

        {/* VIEW 3: Receiver's "My Bookings" Page */}
        {activeView === 'my-bookings' && (
          <MyBookingsView
            currentUser={currentUser}
            onOpenRatingModal={(data) => setRatingData(data)}
            onSwitchToFeed={() => setActiveView('feed')}
          />
        )}

        {/* VIEW 4: Admin Center */}
        {activeView === 'admin' && (
          <AdminDashboard
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-2 px-1">
        <button
          onClick={() => setActiveView('feed')}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold ${
            activeView === 'feed'
              ? 'text-brand-600 dark:text-brand-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <UtensilsCrossed className="w-5 h-5" />
          <span>Surplus Feed</span>
        </button>

        <button
          onClick={() => {
            setPostInitialData(null);
            setPostModalOpen(true);
          }}
          className="flex flex-col items-center gap-1 p-1 text-[10px] font-bold text-brand-600 dark:text-brand-400"
        >
          <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md -mt-3">
            <Plus className="w-5 h-5" />
          </div>
          <span>Donate</span>
        </button>

        {currentUser?.role === 'donor' && (
          <button
            onClick={() => setActiveView('my-posts')}
            className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold ${
              activeView === 'my-posts'
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span>My Posts</span>
          </button>
        )}

        {currentUser?.role === 'receiver' && (
          <button
            onClick={() => setActiveView('my-bookings')}
            className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold ${
              activeView === 'my-bookings'
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span>My Bookings</span>
          </button>
        )}

        <button
          onClick={() => setActiveView('admin')}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold ${
            activeView === 'admin'
              ? 'text-brand-600 dark:text-brand-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span>Admin</span>
        </button>
      </div>

      {/* Modals & Slide-overs */}
      <PostFoodModal
        isOpen={postModalOpen}
        onClose={() => setPostModalOpen(false)}
        currentUser={currentUser}
        initialData={postInitialData}
        onPostCreated={() => {
          fetchFeedPosts();
          if (currentUser?.role === 'donor') {
            setActiveView('my-posts');
          }
        }}
      />

      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        currentUser={currentUser}
        onNavigate={(link) => {
          if (link === '/my-posts') setActiveView('my-posts');
          else if (link === '/my-bookings') setActiveView('my-bookings');
          else if (link === '/admin') setActiveView('admin');
          else setActiveView('feed');
        }}
      />

      <DemoUserSwitcher
        isOpen={userSwitcherOpen}
        onClose={() => setUserSwitcherOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        onOpenAuthModal={() => setAuthModalOpen(true)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          handleSelectUser(user);
        }}
      />

      <ReportModal
        isOpen={Boolean(reportingPost)}
        onClose={() => setReportingPost(null)}
        post={reportingPost}
        currentUser={currentUser}
        onReportSubmitted={() => {
          fetchFeedPosts();
        }}
      />

      <RatingModal
        isOpen={Boolean(ratingData)}
        onClose={() => setRatingData(null)}
        ratingData={ratingData}
        onRatingSubmitted={() => {
          fetchFeedPosts();
        }}
      />
    </div>
  );
}
