# Plate Share 🥗

> A community surplus food rescue platform connecting food donors (restaurants, hostels, caterers, households) with NGOs, charities, and people in need before food spoils.

---

## 📖 Table of Contents

- [Key Capabilities](#-key-capabilities)
- [Tech Stack](#️-tech-stack)
- [Database Schema](#️-database-schema)
- [API Endpoints](#-api-endpoints)
- [Setup & Running Instructions](#-setup--running-instructions)
- [Verification & Testing Checklist](#-verification--testing-checklist)
- [Deployment Notes](#-deployment-notes)
- [Roadmap](#-roadmap)
- [Safety Notice](#️-safety-notice)
- [Contributing](#-contributing)
---

## 🌟 Key Capabilities

- **Users & Roles**:
  - **Food Donors**: Hostel / Mess, Restaurant / Cafe, Caterer / Event host, Wedding / Party host, Household / Individual, Company canteen, Other.
  - **Receivers**: Verified NGOs, charities, and individuals in need.
  - **Admin**: Approves organization profiles, verifies badges, resolves food safety reports, and oversees automated cleanup crons.
- **Strict 3-Stage Automatic Expiry & Cleanup**:
  - **Stage 1 (Instant Server + Client Hide)**: Available feed queries filter `status = 'available' AND expires_at > now`. The client countdown checks every second and removes cards instantly on expiry.
  - **Stage 2 (Minute Cron / On-Demand)**: Marks past-expiry posts as `expired`. Marks uncollected active bookings as `expired_uncollected` and notifies both parties. Sends a 1-hour uncollected pickup reminder to receivers.
  - **Stage 3 (Permanent Cleanup & Impact Preservation)**: Purges posts that expired longer ago than the retention threshold (configurable: 24h default, or 5-minute test mode). Preserves an anonymous summary row in `impact_summaries` before deletion. Never deletes posts with open reports.
- **Double-Booking Prevention**:
  - An SQLite atomic transaction ensures that if two receivers click "Book" simultaneously, only the first transaction commits; the other receives `409 Conflict: "Already booked"`.
- **Donor Features**:
  - Expiry calculation based on optional `cooked_at` + `safe_duration_hours` (1, 2, 3, 4, 6 hrs or a 2-minute test option).
  - Shorter default duration recommendation (2h) for risky foods (non-veg, dairy).
  - Allergen chips (nuts, dairy, gluten, egg, etc.).
  - Mandatory freshness safety pledge before posting.
  - "Repeat last post" one-click button.
  - "My posts" tabs: Live, Booked, Collected, Expired ("Expired and removed").
  - Real-time impact summary: total servings donated, total posts, NGOs helped.
- **Safety, Trust & Notifications**:
  - Two-way ratings after collection (donor rates receiver, receiver rates donor).
  - Safety reporting with a 3-report threshold: 3 reports auto-hide the post and flag the donor for admin review.
  - In-app notification center for booking alerts, pickup directions, expiry warnings, and reminders.
  - Quick demo persona switcher for testing as Restaurant, Hostel, Caterer, Household, Pending Canteen, NGO, Individual, or Admin.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React with Vite (`client/`) | Mobile-first interface for the feed, posting, bookings and admin center |
| **Backend** | Node.js REST API (`server/`) | Auth, posts, bookings, reports, ratings, notifications, admin |
| **Database** | SQLite via [`sql.js`](https://github.com/sql-js/sql.js) | Single-file database saved to `plateshare.db` |
| **Scheduled jobs** | Cron jobs | Expiry every minute, cleanup every hour |
| **Notifications** | In-app notification center | Booking, pickup, expiry and reminder alerts |
| **Version control** | Git and GitHub | Source hosting |

**Key technical decisions**

- **Atomic booking** inside a database transaction prevents double booking.
- **Server-side expiry**: the feed query and cron jobs enforce expiry even when nobody has the app open.
- **Indexed queries** on `(status, expires_at)`, donor and receiver keep the feed and cleanup fast.
- **Audit trail**: `cron_logs` records every job run, and `impact_summaries` keeps anonymous statistics after posts are deleted.

---

## 🗄️ Database Schema

### 1. `users`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Unique user ID |
| `name` | TEXT NOT NULL | Organization or individual name |
| `email` | TEXT UNIQUE NOT NULL | Account email |
| `phone` | TEXT NOT NULL | Contact phone for pickups |
| `password` | TEXT NOT NULL | Account password (must be stored hashed in production) |
| `role` | TEXT NOT NULL | `'donor'` \| `'receiver'` \| `'admin'` |
| `donor_type` | TEXT | `'Hostel / Mess'`, `'Restaurant / Cafe'`, `'Caterer / Event host'`, etc. |
| `is_org` | INTEGER | `1` for organizations / NGOs, `0` for individuals |
| `verification_status` | TEXT | `'pending'` \| `'approved'` \| `'rejected'` |
| `phone_verified` | INTEGER | `1` if phone verified via OTP |
| `otp_code` | TEXT | OTP code (demo `123456`) |
| `rating_avg` | REAL | Average two-way rating (e.g. 4.9) |
| `rating_count` | INTEGER | Number of reviews received |
| `address` | TEXT | Default pickup / organization address |
| `created_at` | TEXT | ISO timestamp |

### 2. `food_posts`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Unique post ID |
| `donor_id` | INTEGER REFERENCES users(id) | Creator donor |
| `donor_name` | TEXT NOT NULL | Donor display name |
| `donor_type` | TEXT NOT NULL | Donor type badge |
| `donor_verified` | INTEGER | `1` if verified organization |
| `contact_phone` | TEXT NOT NULL | Pickup contact phone |
| `food_item` | TEXT NOT NULL | Name of surplus food / meals |
| `servings` | INTEGER NOT NULL | Number of people served |
| `food_type` | TEXT NOT NULL | `'veg'` \| `'non-veg'` |
| `packaging` | TEXT NOT NULL | `'packed'` \| `'open'` \| `'needs containers'` |
| `pickup_address` | TEXT NOT NULL | Physical collection location |
| `notes` | TEXT | Special handling / pickup instructions |
| `photo_url` | TEXT | Food image URL or preset |
| `safe_duration_hours` | REAL NOT NULL | Safe eating duration (e.g. 0.0333 for 2m, 1, 2, 3, 4, 6) |
| `cooked_at` | TEXT | Timestamp when food was prepared |
| `posted_at` | TEXT NOT NULL | Creation timestamp |
| `expires_at` | TEXT NOT NULL | Calculated expiry timestamp |
| `allergens` | TEXT | JSON array of allergens (`["nuts", "dairy"]`) |
| `freshness_confirmed` | INTEGER NOT NULL | Mandatory freshness safety pledge |
| `status` | TEXT NOT NULL | `'available'` \| `'booked'` \| `'collected'` \| `'expired'` |
| `report_count` | INTEGER | Tally of safety reports |
| `is_flagged` | INTEGER | `1` if 3+ reports received (auto-hidden) |
| `latitude`, `longitude` | REAL | Coordinates for distance calculation |

### 3. `bookings`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Booking ID |
| `post_id` | INTEGER REFERENCES food_posts(id) | Food post reference |
| `receiver_id` | INTEGER REFERENCES users(id) | Claiming NGO / individual |
| `receiver_name` | TEXT NOT NULL | Receiver display name |
| `receiver_phone` | TEXT NOT NULL | Receiver contact phone |
| `booked_at` | TEXT NOT NULL | Booking timestamp |
| `status` | TEXT NOT NULL | `'active'` \| `'collected'` \| `'expired_uncollected'` |
| `pickup_address` | TEXT NOT NULL | Confirmed pickup address |
| `donor_contact` | TEXT NOT NULL | Donor phone number |
| `reminder_sent` | INTEGER | `1` if 1-hour uncollected reminder sent |
| `collected_at` | TEXT | Handover timestamp |

### 4. `reports`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Report ID |
| `post_id` | INTEGER REFERENCES food_posts(id) | Reported post reference |
| `donor_id` | INTEGER | Donor reference |
| `reporter_id` | INTEGER REFERENCES users(id) | Reporter user reference |
| `reporter_name` | TEXT NOT NULL | Reporter name |
| `reason` | TEXT NOT NULL | `'spoiled food'`, `'wrong address'`, `'fake donor'`, `'other'` |
| `details` | TEXT | User statement |
| `status` | TEXT NOT NULL | `'open'` \| `'resolved'` \| `'dismissed'` |

### 5. `ratings`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Rating ID |
| `booking_id` | INTEGER | Associated booking reference |
| `from_user_id` | INTEGER | Reviewer user ID |
| `to_user_id` | INTEGER | Recipient user ID |
| `direction` | TEXT NOT NULL | `'donor_to_receiver'` \| `'receiver_to_donor'` |
| `rating` | INTEGER NOT NULL | 1 to 5 stars |
| `comment` | TEXT | Review remarks |

### 6. `impact_summaries`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Summary row ID |
| `post_id` | INTEGER | Archived post reference |
| `donor_id` | INTEGER | Donor user reference |
| `donor_type` | TEXT NOT NULL | Restaurant, Hostel, Caterer, etc. |
| `food_type` | TEXT NOT NULL | Veg vs Non-veg |
| `servings` | INTEGER NOT NULL | Servings count preserved |
| `outcome` | TEXT NOT NULL | `'collected'` \| `'expired'` |
| `event_date` | TEXT NOT NULL | Date string (`YYYY-MM-DD`) |

### 7. `notifications`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Notification ID |
| `user_id` | INTEGER NOT NULL | Target user |
| `title` | TEXT NOT NULL | Notification title |
| `message` | TEXT NOT NULL | Notification content |
| `type` | TEXT NOT NULL | `'booking'`, `'pickup'`, `'expiry'`, `'reminder'`, `'report'`, `'approval'` |
| `is_read` | INTEGER | `0` = unread, `1` = read |

### 8. `cron_logs`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Log ID |
| `job_type` | TEXT NOT NULL | Which job ran (expiry or cleanup) |
| `details` | TEXT | What the job did |
| `items_affected` | INTEGER | Number of rows changed or deleted |
| `executed_at` | TEXT NOT NULL | Run timestamp |

**Indexes:** `food_posts(status, expires_at)`, `food_posts(donor_id)`, `bookings(receiver_id)`, `reports(post_id)`.

---

## 📡 API Endpoints

### Authentication & Profiles (`/api/auth`)
- `GET /api/auth/users` — List all accounts (powers demo persona switcher).
- `POST /api/auth/register` — Register donor or receiver (orgs start as pending).
- `POST /api/auth/login` — Login with email/phone and password.
- `POST /api/auth/verify-otp` — Verify phone OTP (demo code `123456`).

### Food Posts (`/api/posts`)
- `GET /api/posts` — Feed of available food only (`status = 'available' AND expires_at > now AND is_flagged = 0`), sorted by soonest expiry (`expires_at ASC`). Supports filters: `donor_type`, `food_type`, `min_servings`, `max_distance`, `user_lat`, `user_lng`.
- `POST /api/posts` — Create a post with safety pledge, allergen list, and calculated expiry from cooked time.
- `GET /api/posts/my-posts?donor_id=:id` — Donor's listings with Live, Booked, Collected, and Expired statuses.
- `GET /api/posts/last?donor_id=:id` — Donor's last listing for "Repeat last post".
- `POST /api/posts/:id/cancel` — Manually remove a live post from the feed.
- `POST /api/posts/:id/collected` — Mark a booked post collected and prompt rating.
- `POST /api/posts/:id/report` — Report a food listing (3 reports trigger auto-hide).

### Bookings (`/api/bookings`)
- `POST /api/bookings` — Atomic booking with double-booking race condition prevention.
- `GET /api/bookings/my-bookings?receiver_id=:id` — Receiver's claimed food with donor contacts and pickup directions.

### Admin Operations (`/api/admin`)
- `GET /api/admin/pending-users` — Pending organizations & NGOs.
- `POST /api/admin/users/:id/verify` — Approve or reject an organization profile.
- `GET /api/admin/reports` — Open reports review.
- `POST /api/admin/reports/:id/resolve` — Dismiss or take down the reported listing.
- `GET /api/admin/system-stats` — Platform counts and metrics.
- `POST /api/admin/cron/expire` — Run Stage 2 expiry check now.
- `POST /api/admin/cron/cleanup` — Run Stage 3 cleanup (accepts `retentionMinutes`, e.g. 5 for test mode).
- `GET /api/admin/cron-logs` — History of cron executions.

### Ratings (`/api/ratings`)
- `POST /api/ratings` — Submit a 1-5 star review for a donor or receiver.
- `GET /api/ratings/user/:id` — View a user's received ratings.

### Impact Metrics (`/api/impact`)
- `GET /api/impact/summary` — Servings donated, meals saved, posts created, and NGOs helped.

### Notifications (`/api/notifications`)
- `GET /api/notifications?user_id=:id` — User notifications and unread count.
- `POST /api/notifications/:id/read` — Mark a single notification read.
- `POST /api/notifications/read-all` — Mark all read.

---

## 🚀 Setup & Running Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or newer
- Git

### Quick Start

1. **Clone the repository and install dependencies**:
   ```bash
   git clone https://github.com/akib6momin/PlateShare-.git
   cd PlateShare-
   npm install
   cd client && npm install && cd ..
   ```
2. **Build the frontend** (the backend serves the built files):
   ```bash
   cd client && npm run build && cd ..
   ```
3. **Seed the database with sample data**:
   ```bash
   node server/seed.js
   ```
4. **Start the backend server (serves API and built frontend)**:
   ```bash
   node server/index.js
   ```
5. Open your browser and go to:
   ```
   http://localhost:5000
   ```

*(Optional dev mode: run `npm run client` in `client/` for Vite hot-module reload on `http://localhost:3000`.)*

---

## 🧪 Verification & Testing Checklist

### 1. Test Seed Data
Click **"Role: [Name]"** in the top bar to inspect pre-seeded entities:
- 🍽️ **Green Leaf Bistro** (Restaurant / Cafe)
- 🏨 **St. Jude Student Hostel** (Hostel / Mess)
- 🥘 **Royal Feast Caterers** (Caterer / Event)
- 🏡 **Priya Sharma** (Household / Individual)
- 🏢 **Apex Canteen Services** (Pending Org Donor)
- 🥣 **Hope Community Kitchen NGO** (Receiver)
- 📦 **City Food Bank Charity** (Receiver)
- 👤 **Rahul Verma** (Individual in Need)
- 🛡️ **PlateShare Admin** (Admin Operations)

### 2. Verify Stage 1 (Instant Hide & Live Countdown)
- Look at **Post #6 ("10 Snack & Fruit Packs")**, which has a **2-minute safe duration**.
- Watch the live countdown tick down in real time.
- The moment it reaches `00m 00s`, it disappears from the screen.
- Refresh the page: the server feed query (`status = 'available' AND expires_at > now`) omits it.

### 3. Verify Amber Urgency Highlight (< 30 Minutes Remaining)
- Check **Post #1 ("40 Dal Makhani & Jeera Rice Meals")**: it was cooked 1h 42m ago with a 2-hour safe duration, leaving about 18 minutes.
- Notice the **pulsing amber border**, **amber badge**, and **"SOON!" urgency tag**.

### 4. Verify Double-Booking Race Condition Prevention
- Log in as **Hope Community Kitchen** and click **"Book this food"** on an available post.
- The post is reserved for Hope Community Kitchen and immediately disappears from the available feed.
- Any concurrent attempt to claim the same listing receives **`409 Conflict: Already booked`**.

### 5. Verify Stage 2 (Mark Expired & Notify)
- Switch to **Admin Center** (`/admin`).
- Open the **"Auto-Expiry & Deletion Testing Console"** tab.
- Click **"Run Stage 2 Expiry Check Now"** (or wait for the minute cron).
- Check the execution log: expired listings move to status `'expired'`, uncollected bookings expire, and notifications go to both parties.
- Switch to donor **Green Leaf Bistro**, open **My Posts**, and see the listing labelled **"Expired and removed"**.

### 6. Verify Stage 3 (Permanent Cleanup with 5-Minute Test Mode)
- In the Admin Testing Console, click **"Test 5-Min Cleanup"** (or run the 24-hour standard mode).
- Post #5 (expired more than 2.8 hours ago) is permanently deleted from `food_posts`.
- Check `impact_summaries`: an anonymous record with servings, donor type, food type, and outcome is saved, so impact totals are never lost.

### 7. Verify Open Report Guard
- Submit a report on a post.
- Run Stage 3 cleanup: the console skips the post, because posts with open reports are never deleted until an admin resolves them.
- Dismiss or take down the report in the Admin Reports tab to resolve it.

---

## 📦 Deployment Notes

- **Persistent disk required:** the SQLite file is wiped on hosts with temporary storage (for example free tiers of Render or Heroku). Use a persistent volume, or move to PostgreSQL.
- **Single instance only:** the database lives in one process's memory, so do not run multiple copies of the server.
- **Back up regularly:** copy `plateshare.db` somewhere safe.
- **Before going live:**
  - Store passwords as hashes (for example with `bcrypt`), never as plain text.
  - Replace the demo OTP `123456` with a real SMS provider.
  - Never commit `.env` or `plateshare.db`.

---

## 🗺️ Roadmap

- [ ] Map view with distance and route to pickup
- [ ] Volunteer or delivery-partner role
- [ ] Recurring scheduled donations
- [ ] SMS, email and WhatsApp notifications
- [ ] Multi-language support
- [ ] Admin analytics dashboard
- [ ] Migration to PostgreSQL

---

## ⚠️ Safety Notice

Plate Share does not inspect food. Donors must confirm that food is freshly prepared and safe, and receivers should always check that food is fresh before eating.

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push the branch: `git push origin feature/your-feature`
5. Open a pull request

---

