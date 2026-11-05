const { getDb } = require('./db');

async function seed() {
  console.log('🌱 Seeding PlateShare Database...');
  const db = await getDb();

  // Reset existing tables for clean seed
  db.exec(`
    DELETE FROM ratings;
    DELETE FROM reports;
    DELETE FROM bookings;
    DELETE FROM food_posts;
    DELETE FROM notifications;
    DELETE FROM impact_summaries;
    DELETE FROM cron_logs;
    DELETE FROM users;
  `);

  const now = new Date();
  const nowIso = now.toISOString();

  // Helper date offset in minutes
  const addMinutes = (mins) => new Date(now.getTime() + mins * 60 * 1000).toISOString();
  const subMinutes = (mins) => new Date(now.getTime() - mins * 60 * 1000).toISOString();

  // 1. Seed Users
  // Password for all seeded users is "pass123"
  const users = [
    {
      id: 1,
      name: 'St. Jude Student Hostel Mess',
      email: 'hostel@plateshare.com',
      phone: '+91 98200 11001',
      password: 'password123',
      role: 'donor',
      donor_type: 'Hostel / Mess',
      is_org: 1,
      verification_status: 'approved',
      phone_verified: 1,
      rating_avg: 4.8,
      rating_count: 14,
      address: 'Plot 42, North Campus Road, Vidyavihar, Mumbai'
    },
    {
      id: 2,
      name: 'Green Leaf Bistro',
      email: 'bistro@plateshare.com',
      phone: '+91 98200 11002',
      password: 'password123',
      role: 'donor',
      donor_type: 'Restaurant / Cafe',
      is_org: 1,
      verification_status: 'approved',
      phone_verified: 1,
      rating_avg: 4.9,
      rating_count: 28,
      address: 'Shop 12, Galleria Mall, Powai, Mumbai'
    },
    {
      id: 3,
      name: 'Royal Feast Caterers',
      email: 'caterer@plateshare.com',
      phone: '+91 98200 11003',
      password: 'password123',
      role: 'donor',
      donor_type: 'Caterer / Event host',
      is_org: 1,
      verification_status: 'approved',
      phone_verified: 1,
      rating_avg: 4.7,
      rating_count: 19,
      address: 'Shed 5, Industrial Estate, Marol, Andheri East, Mumbai'
    },
    {
      id: 4,
      name: 'Priya Sharma (Household)',
      email: 'priya@plateshare.com',
      phone: '+91 98200 11004',
      password: 'password123',
      role: 'donor',
      donor_type: 'Household / Individual',
      is_org: 0,
      verification_status: 'approved',
      phone_verified: 1,
      rating_avg: 5.0,
      rating_count: 5,
      address: 'Flat 402, Sunshine Heights, Chandivali, Mumbai'
    },
    {
      id: 5,
      name: 'Apex Canteen Services',
      email: 'canteen@plateshare.com',
      phone: '+91 98200 11005',
      password: 'password123',
      role: 'donor',
      donor_type: 'Company canteen',
      is_org: 1,
      verification_status: 'pending', // Pending admin approval test!
      phone_verified: 1,
      rating_avg: 5.0,
      rating_count: 0,
      address: 'Floor 2, Mindspace Tech Park, Airoli, Navi Mumbai'
    },
    {
      id: 6,
      name: 'Hope Community Kitchen NGO',
      email: 'hope@plateshare.com',
      phone: '+91 98200 11006',
      password: 'password123',
      role: 'receiver',
      donor_type: null,
      is_org: 1,
      verification_status: 'approved',
      phone_verified: 1,
      rating_avg: 4.9,
      rating_count: 32,
      address: 'Community Center, Sector 3, Ghatkopar West, Mumbai'
    },
    {
      id: 7,
      name: 'City Food Bank Charity',
      email: 'cityfood@plateshare.com',
      phone: '+91 98200 11007',
      password: 'password123',
      role: 'receiver',
      donor_type: null,
      is_org: 1,
      verification_status: 'approved',
      phone_verified: 1,
      rating_avg: 4.8,
      rating_count: 24,
      address: 'Relief Depot 7, LBS Road, Kurla, Mumbai'
    },
    {
      id: 8,
      name: 'Rahul Verma (Individual in need)',
      email: 'rahul@plateshare.com',
      phone: '+91 98200 11008',
      password: 'password123',
      role: 'receiver',
      donor_type: null,
      is_org: 0,
      verification_status: 'approved',
      phone_verified: 1,
      rating_avg: 5.0,
      rating_count: 3,
      address: 'Transit Camp, Sakinaka, Mumbai'
    },
    {
      id: 9,
      name: 'PlateShare Admin',
      email: 'admin@plateshare.com',
      phone: '+91 98200 11009',
      password: 'password123',
      role: 'admin',
      donor_type: null,
      is_org: 0,
      verification_status: 'approved',
      phone_verified: 1,
      rating_avg: 5.0,
      rating_count: 0,
      address: 'PlateShare Headquarters, Bandra Kurla Complex, Mumbai'
    }
  ];

  for (const u of users) {
    db.run(
      `INSERT INTO users (id, name, email, phone, password, role, donor_type, is_org, verification_status, phone_verified, rating_avg, rating_count, address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        u.id,
        u.name,
        u.email,
        u.phone,
        u.password,
        u.role,
        u.donor_type,
        u.is_org,
        u.verification_status,
        u.phone_verified,
        u.rating_avg,
        u.rating_count,
        u.address,
        nowIso
      ]
    );
  }

  // 2. Seed 6 Sample Food Posts with Different Expiry Times
  const posts = [
    {
      id: 1,
      donor_id: 2, // Green Leaf Bistro
      donor_name: 'Green Leaf Bistro',
      donor_type: 'Restaurant / Cafe',
      donor_verified: 1,
      contact_phone: '+91 98200 11002',
      food_item: '40 Dal Makhani & Jeera Rice Meal Trays',
      servings: 40,
      food_type: 'veg',
      packaging: 'packed',
      pickup_address: 'Shop 12, Galleria Mall, Powai, Mumbai',
      notes: 'Cooked fresh for lunch service. Hot and hygienically packed in individual meal trays with disposable spoons.',
      photo_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
      safe_duration_hours: 2,
      cooked_at: subMinutes(102), // Cooked 1 hr 42m ago
      posted_at: subMinutes(100),
      expires_at: addMinutes(18), // EXPIRES IN 18 MINS (< 30 mins, AMBER URGENT!)
      allergens: JSON.stringify(['dairy']),
      freshness_confirmed: 1,
      status: 'available',
      latitude: 19.1176,
      longitude: 72.9060
    },
    {
      id: 2,
      donor_id: 1, // St. Jude Hostel
      donor_name: 'St. Jude Student Hostel Mess',
      donor_type: 'Hostel / Mess',
      donor_verified: 1,
      contact_phone: '+91 98200 11001',
      food_item: '35 Fresh Veg Thali Servings (Roti, Mixed Veg & Dal)',
      servings: 35,
      food_type: 'veg',
      packaging: 'packed',
      pickup_address: 'Plot 42, North Campus Road, Vidyavihar, Mumbai',
      notes: 'Freshly prepared student dinner surplus. Packed in eco-friendly meal boxes. Keep dry.',
      photo_url: 'https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=600&q=80',
      safe_duration_hours: 4,
      cooked_at: subMinutes(60), // Cooked 1 hr ago
      posted_at: subMinutes(55),
      expires_at: addMinutes(180), // EXPIRES IN 3 HOURS
      allergens: JSON.stringify(['gluten']),
      freshness_confirmed: 1,
      status: 'available',
      latitude: 19.0833,
      longitude: 72.8980
    },
    {
      id: 3,
      donor_id: 3, // Royal Feast Caterers
      donor_name: 'Royal Feast Caterers',
      donor_type: 'Caterer / Event host',
      donor_verified: 1,
      contact_phone: '+91 98200 11003',
      food_item: '25 Portions Mughlai Chicken Biryani with Raita',
      servings: 25,
      food_type: 'non-veg',
      packaging: 'needs containers',
      pickup_address: 'Shed 5, Industrial Estate, Marol, Andheri East, Mumbai',
      notes: 'From an afternoon corporate luncheon. Stored in hot bain-marie. Please bring clean stainless vessels.',
      photo_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
      safe_duration_hours: 2, // Risky food default 2 hrs
      cooked_at: subMinutes(30),
      posted_at: subMinutes(25),
      expires_at: addMinutes(90), // EXPIRES IN 1.5 HOURS
      allergens: JSON.stringify(['dairy']),
      freshness_confirmed: 1,
      status: 'available',
      latitude: 19.1136,
      longitude: 72.8697
    },
    {
      id: 4,
      donor_id: 4, // Priya Sharma (Household)
      donor_name: 'Priya Sharma (Household)',
      donor_type: 'Household / Individual',
      donor_verified: 1,
      contact_phone: '+91 98200 11004',
      food_item: '15 Packed Chana Masala with Wheat Parathas',
      servings: 15,
      food_type: 'veg',
      packaging: 'packed',
      pickup_address: 'Flat 402, Sunshine Heights, Chandivali, Mumbai',
      notes: 'Prepared for family puja celebration. All foil wrapped in portions of 2 parathas + cup curry.',
      photo_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
      safe_duration_hours: 3,
      cooked_at: subMinutes(45),
      posted_at: subMinutes(40),
      expires_at: addMinutes(135),
      allergens: JSON.stringify(['gluten']),
      freshness_confirmed: 1,
      status: 'booked', // Already booked by Hope Community Kitchen
      latitude: 19.1098,
      longitude: 72.8931
    },
    {
      id: 5,
      donor_id: 2, // Green Leaf Bistro
      donor_name: 'Green Leaf Bistro',
      donor_type: 'Restaurant / Cafe',
      donor_verified: 1,
      contact_phone: '+91 98200 11002',
      food_item: '12 Grilled Paneer & Veggie Sandwiches',
      servings: 12,
      food_type: 'veg',
      packaging: 'packed',
      pickup_address: 'Shop 12, Galleria Mall, Powai, Mumbai',
      notes: 'Breakfast unsold batch. Wrapped in greaseproof brown paper.',
      photo_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
      safe_duration_hours: 2,
      cooked_at: subMinutes(300),
      posted_at: subMinutes(290),
      expires_at: subMinutes(170), // EXPIRED 2.8 HOURS AGO
      allergens: JSON.stringify(['dairy', 'gluten']),
      freshness_confirmed: 1,
      status: 'expired', // Stage 2 expired, awaiting Stage 3 cleanup
      latitude: 19.1176,
      longitude: 72.9060
    },
    {
      id: 6,
      donor_id: 1, // St. Jude Hostel
      donor_name: 'St. Jude Student Hostel Mess',
      donor_type: 'Hostel / Mess',
      donor_verified: 1,
      contact_phone: '+91 98200 11001',
      food_item: '10 Fresh Banana Snack & Muffin Packs (2-Min Test Listing)',
      servings: 10,
      food_type: 'veg',
      packaging: 'packed',
      pickup_address: 'Plot 42, North Campus Road, Vidyavihar, Mumbai',
      notes: '⭐ RAPID TEST POST: Configured with 2-minute expiry so you can witness the live countdown tick to zero, auto-hide from receiver feed, and test the Stage 2 & 3 cron jobs!',
      photo_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80',
      safe_duration_hours: 0.0333, // 2 minutes
      cooked_at: nowIso,
      posted_at: nowIso,
      expires_at: addMinutes(2), // EXPIRES IN EXACTLY 2 MINUTES!
      allergens: JSON.stringify(['gluten', 'egg']),
      freshness_confirmed: 1,
      status: 'available',
      latitude: 19.0833,
      longitude: 72.8980
    }
  ];

  for (const p of posts) {
    db.run(
      `INSERT INTO food_posts (
        id, donor_id, donor_name, donor_type, donor_verified, contact_phone, 
        food_item, servings, food_type, packaging, pickup_address, notes, 
        photo_url, safe_duration_hours, cooked_at, posted_at, expires_at, 
        allergens, freshness_confirmed, status, latitude, longitude, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id,
        p.donor_id,
        p.donor_name,
        p.donor_type,
        p.donor_verified,
        p.contact_phone,
        p.food_item,
        p.servings,
        p.food_type,
        p.packaging,
        p.pickup_address,
        p.notes,
        p.photo_url,
        p.safe_duration_hours,
        p.cooked_at,
        p.posted_at,
        p.expires_at,
        p.allergens,
        p.freshness_confirmed,
        p.status,
        p.latitude,
        p.longitude,
        p.posted_at,
        p.posted_at
      ]
    );
  }

  // 3. Seed Existing Booking for Post #4 (booked by Hope Community Kitchen)
  db.run(
    `INSERT INTO bookings (id, post_id, receiver_id, receiver_name, receiver_phone, booked_at, status, pickup_address, donor_contact)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      1,
      4,
      6, // Hope Community Kitchen
      'Hope Community Kitchen NGO',
      '+91 98200 11006',
      subMinutes(35),
      'active',
      'Flat 402, Sunshine Heights, Chandivali, Mumbai',
      '+91 98200 11004'
    ]
  );

  // 4. Seed Historical Impact Summaries (simulating previously collected & expired items)
  const summaries = [
    { donor_id: 2, donor_type: 'Restaurant / Cafe', food_type: 'veg', servings: 65, outcome: 'collected', date: '2026-10-24' },
    { donor_id: 1, donor_type: 'Hostel / Mess', food_type: 'veg', servings: 80, outcome: 'collected', date: '2026-10-25' },
    { donor_id: 3, donor_type: 'Caterer / Event host', food_type: 'non-veg', servings: 50, outcome: 'collected', date: '2026-10-25' },
    { donor_id: 2, donor_type: 'Restaurant / Cafe', food_type: 'veg', servings: 15, outcome: 'expired', date: '2026-10-23' }
  ];

  for (const s of summaries) {
    db.run(
      `INSERT INTO impact_summaries (donor_id, donor_type, food_type, servings, outcome, event_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [s.donor_id, s.donor_type, s.food_type, s.servings, s.outcome, s.date, nowIso]
    );
  }

  // 5. Seed Welcome Notifications
  db.run(
    `INSERT INTO notifications (user_id, title, message, type, link, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      6,
      'Booking Confirmed',
      'You booked "15 Packed Chana Masala with Wheat Parathas". Contact donor Priya at +91 98200 11004 for pickup.',
      'booking',
      '/my-bookings',
      subMinutes(35)
    ]
  );

  db.run(
    `INSERT INTO notifications (user_id, title, message, type, link, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      4,
      'Food Booked!',
      'Hope Community Kitchen NGO booked your listing "15 Packed Chana Masala with Wheat Parathas".',
      'booking',
      '/my-posts',
      subMinutes(35)
    ]
  );

  console.log('✅ Seed completed successfully:');
  console.log(`- 9 Users created (Hostel, Bistro, Caterer, Household, Canteen, 2 NGOs, 1 Individual, 1 Admin)`);
  console.log(`- 6 Food Posts created:`);
  console.log(`  1. #1: "Dal Makhani Trays" (Expires in ~18m -> AMBER URGENT)`);
  console.log(`  2. #2: "Veg Thali Boxes" (Expires in 3 hours)`);
  console.log(`  3. #3: "Chicken Biryani" (Expires in 1.5 hours)`);
  console.log(`  4. #4: "Chana Masala Parathas" (BOOKED by Hope Community Kitchen)`);
  console.log(`  5. #5: "Paneer Sandwiches" (EXPIRED 2.8 hrs ago)`);
  console.log(`  6. #6: "Snack Packs" (RAPID 2-MIN TEST POST)`);
}

if (require.main === module) {
  seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

module.exports = { seed };
