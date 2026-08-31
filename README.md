<div align="center">

# ☕ Coffeely — Premium Companion & Social Platform

**India's #1 Safe, Verified & Escrow-Protected Companion Ecosystem**
*Connect with authentic partners for coffee dates, movies, events, study sessions, and high-quality conversations.*

[![Live Website](https://img.shields.io/badge/🌐_Live_App-coffeely--app.vercel.app-0095f6?style=for-the-badge&logo=vercel&logoColor=white)](https://coffeely-app.vercel.app)
[![API Server](https://img.shields.io/badge/⚡_API_Server-Render_Live-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://coffeely-backend.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Security Status](https://img.shields.io/badge/Security-Hardened_HS256_&_Escrow-green.svg?style=for-the-badge&logo=shield)](backend/server.js)

<br />

```
       _____ ____  ______ ______ ______ ______ ______ _    WW 
      / ____/ __ \|  ____|  ____|  ____|  ____|  ____| |   __ 
     | |   | |  | | |__  | |__  | |__  | |__  | |__  | |  |  |
     | |   | |  | |  __| |  __| |  __| |  __| |  __| | |  |  |
     | |___| |__| | |    | |    | |____| |____| |____| |__|  |
      \_____\____/|_|    |_|    |______|______|______|_____/ 
```

</div>

---

## 🌟 Key Highlights & Production Features

### 🛡️ 1. 100% Escrow Protection Engine & Razorpay Checkout
- **Guaranteed Safety**: Client booking payments are held safely in 100% Escrow and only released to the companion after session completion.
- **Multi-Method Gateway**: Supports Instant UPI (GPay, PhonePe, Paytm, BHIM, custom VPA), Debit/Credit Cards, and NetBanking.
- **Automated Lifecycle**: Auto-releases funds to companion wallet when a date is marked complete, and issues automated 100% refunds upon session cancellation or rejection.

### 💰 2. Companion Wallet & Instant Payout System
- **Real-Time Earnings Overview**: 3 live metric overview cards tracking **Available Balance**, **Locked in Escrow 🔒**, and **Lifetime Earnings 💰**.
- **Flexible Withdrawal Channels**: 1-click payout requests via **⚡ Instant UPI ID** or **🏦 Direct Bank IMPS/NEFT Transfer** (Min ₹500).
- **Audit-Ready History**: Complete transaction ledger filtering Escrow Credits, Holds, and Withdrawals.

### 🔒 3. WhatsApp-Style Locked Private Chats & Hidden Ghost Mode
- **4-Digit PIN Security**: Lock sensitive private conversations behind custom encrypted PIN security.
- **Secret Ghost Mode**: Hide chats from the conversation feed completely. Reveal hidden chats only by typing your secret PIN in the chat search bar.

### 🗺️ 4. Live Interactive Map View & Proximity Companion Discovery
- **Geographic Exploration**: Interactive Leaflet + OpenStreetMap discovery view showcasing companions in your area.
- **Proximity Filters & Distance Calculation**: Haversine distance calculator with custom search radii (5km, 10km, 25km, 50km) and direct 1-tap booking popups.

### 📄 5. Digital PDF & Printable Tax Invoices
- **Instant Tax Receipts**: Professional booking receipts with Invoice #, itemized rate breakdown, client/companion details, date/location, and digital verification seal.
- **1-Click Print / Save as PDF**: Seamless `window.print()` integration formatted for standard A4 and PDF downloads.

### 📞 6. WebRTC Peer-to-Peer HD Audio & Video Calling
- **Zero-Lag Connection**: High-definition WebRTC calling with live ringtones and native incoming/outgoing call overlays.
- **In-Call Controls**: Flip front/rear camera, toggle mute/unmute, disable video feed, and real-time duration counter.

### 💬 7. Real-Time Socket.io Chat Engine
- **Instant Messaging**: Real-time bi-directional chat with live typing indicators (`typing...`) and online/offline status pulses.
- **Rich Media & Controls**: Photo sharing with full screen lightbox, star favorite messages, block user, report abuse, and disapearing message settings.

### 🚨 8. SOS Emergency Safety System
- **One-Tap Emergency Alert**: Instant emergency trigger sending live GPS latitude/longitude coordinates to trusted contacts and live Admin Monitoring Dashboard.
- **Trusted Contacts**: Store up to 3 validated emergency phone numbers & email addresses.

### 📅 9. Availability Calendar & Time Slot Scheduler
- **Time Slot Selection**: Morning (10am-12pm), Afternoon (1pm-3pm), Evening (4pm-6pm), Night (7pm-9pm), Late Night (9pm-11pm).
- **Double Booking Protection**: Automatic server-side slot locking — disables booked slots with `Booked 🔒` badges.

### 🎭 10. 24-Hour Ephemeral Stories
- **Daily Highlights**: Share real-time photos and status updates that automatically expire after 24 hours.
- **Instagram-Style Story Viewer**: 5-second progress bars, tap to skip left/right, press-to-pause, and creator controls.

### 👑 11. Super Admin Control Panel & Payout Settlement Queue
- **Comprehensive Oversight**: Manage user freeze/unfreeze, platform suspension, report resolution, live SOS alerts, and analytical charts.
- **1-Click Payout Settlement**: Review companion withdrawal requests and 1-click approve with Bank UTR reference tracking.

---

## 🛠️ Tech Stack & Architecture

### **Frontend**
- **Framework**: React 19 SPA (Single Page Application)
- **Styling**: Tailwind CSS (Dark Glassmorphism & Sleek Cyberpunk Aesthetics)
- **Maps**: Leaflet & React-Leaflet with OpenStreetMap tiles
- **Icons**: React Icons (`fi`, `fa`, `ai`, `bs`)
- **Real-time**: `socket.io-client` & WebRTC (`RTCPeerConnection`)
- **Image Compression**: `browser-image-compression`

### **Backend**
- **Runtime**: Node.js v18+ & Express.js
- **Database**: PostgreSQL (Neon Cloud DB) with `pg.Pool` connection pooling
- **Sockets**: `socket.io` server handling rooms, status, calling, & chat
- **Email**: Brevo HTTP API (Transaction OTP Email Verification)
- **Media Cloud**: Cloudinary API
- **Financials**: Custom Escrow Engine & Razorpay Gateway Integration

### **Security & Shielding**
- **JWT Protection**: `HS256` strict algorithm verification with auto-expiry
- **Security Headers**: Helmet.js (`HSTS`, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Permissions-Policy`)
- **Input Sanitization**: XSS payload cleaner stripping `<script>`, `javascript:`, and null byte poisoning
- **Rate Limiting**: Multi-tier IP throttling (Brute-force protection on Auth & API endpoints)

---

## ⚙️ Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/Priyanshu-kumar-maurya/companion-app.git
cd companion-app
```

### 2. Install Dependencies
```bash
# Install Frontend Dependencies
npm install

# Install Backend Dependencies
cd backend
npm install
```

### 3. Setup Environment Variables (`backend/.env`)
Create a `.env` file in the `backend/` folder:

```env
PORT=5000
DATABASE_URL=postgres://user:password@ep-host.neon.tech/neondb?sslmode=require
JWT_SECRET=your_super_secret_jwt_key_here

# Brevo HTTP Email API
BREVO_API_KEY=your_brevo_api_key_here
EMAIL_USER=noreply@coffeely.com
EMAIL_FROM_NAME=Coffeely

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay Escrow Gateway
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### 4. Start Local Development Servers
```bash
# Terminal 1 — Start React Frontend (Port 3000)
npm start

# Terminal 2 — Start Express Backend (Port 5000)
cd backend
node server.js
```

---

## 🗂️ Project Directory Structure

```
companion-app/
├── src/                            # React Frontend Source
│   ├── components/
│   │   ├── HomePage.jsx            # Landing Page & Featured Companions
│   │   ├── AdminDashboard.jsx      # Super Admin Panel & Payout Settlement
│   │   ├── UnifiedLogin.jsx        # Login & Password Recovery
│   │   ├── UnifiedRegister.jsx     # Registration & OTP Verification
│   │   ├── NotificationsPage.jsx   # In-App Notification Center
│   │   ├── Navbar.jsx              # Global Header & Mobile Bottom Nav Bar
│   │   ├── boy/                    # Boy Dashboard & Invoice Viewer
│   │   ├── girl/                   # Companion Dashboard & Wallet Hub
│   │   │   ├── GirlDashboard.jsx   # Companion Profile & Schedule Hub
│   │   │   └── GirlWalletTab.jsx   # Live Wallet Balance & Withdrawal Hub
│   │   └── shared/                 # Shared Modules
│   │       ├── ChatPage.jsx        # WhatsApp-style Real-time Messaging
│   │       ├── MessagesPage.jsx    # Inbox, Locked & Hidden Chats Manager
│   │       ├── DetailsPage.jsx     # Companion Profile & Slot Booking
│   │       ├── FindPage.jsx        # Companion Feed & Filters
│   │       ├── CompanionMapView.jsx# Leaflet Interactive Proximity Map
│   │       ├── PaymentModal.jsx    # Razorpay & Escrow Checkout Modal
│   │       ├── InvoiceModal.jsx    # Digital Tax Invoice Modal
│   │       ├── CallOverlay.jsx     # WebRTC Video/Audio Call Overlay
│   │       ├── SOSButton.jsx       # Emergency SOS Alert Trigger
│   │       ├── StoriesBar.jsx      # 24h Ephemeral Stories Rings Bar
│   │       └── StoryViewerModal.jsx# Fullscreen Story Player
│   ├── utils/
│   │   └── chatLockManager.js      # PIN Security & Ghost Mode Storage
│   └── App.js
│
├── backend/                        # Node.js & Express REST Backend
│   ├── server.js                   # Application Entry Point & Security
│   ├── config/
│   │   └── db.js                   # PostgreSQL Pool & Auto Schema Migrations
│   ├── routes/
│   │   ├── authRoutes.js           # Auth, Registration, Login, OTP
│   │   ├── userRoutes.js           # Users, Favorites, Profiles, Followers
│   │   ├── bookingRoutes.js        # Bookings & Auto Escrow Lifecycle
│   │   ├── paymentRoutes.js        # Escrow Orders, Verification & Payouts
│   │   ├── chatRoutes.js           # Real-Time Chat Storage
│   │   ├── postRoutes.js           # Gallery Posts & Likes
│   │   ├── storyRoutes.js          # 24h Ephemeral Stories
│   │   ├── sosRoutes.js            # Emergency SOS System
│   │   └── adminRoutes.js          # Admin Controls & Moderation
│   ├── middleware/
│   │   ├── auth.js                 # JWT Authentication & Status Check
│   │   ├── rateLimiter.js          # In-Memory Request Rate Limiter
│   │   ├── sanitize.js             # XSS & Injection Sanitizer
│   │   └── contentFilter.js        # Profanity & Contact-Sharing Filter
│   └── socket/
│       └── socket.js               # Socket.io Calling & Messaging Handler
└── README.md
```

---

## 🔒 Security & Compliance Infrastructure

- 🛡️ **100% Escrow Protection**: All companion bookings are safely held until mutual completion.
- 🛡️ **JWT Expiration & HS256 Whitelist**: Prevents token forgery and unauthorized payload manipulation.
- 🛡️ **Helmet & HTTP Hardening**: Injects 30+ enterprise security headers including strict HSTS & CSP.
- 🛡️ **XSS Input Sanitization**: Automatically strips `<script>`, `javascript:`, and null byte poisoning vectors.
- 🛡️ **Parameter Pollution Guard**: Neutralizes array manipulation attacks in query parameters.
- 🛡️ **Brute-Force Rate Limiting**: Multi-tier request throttling on sensitive auth endpoints.

---

## 🌐 Live Services & Deployment Links

| Component | Host Service | Status | Live Link |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | Vercel | ![Vercel Status](https://img.shields.io/badge/Status-Online-brightgreen?style=flat-square) | [coffeely-app.vercel.app](https://coffeely-app.vercel.app) |
| **Backend REST Server** | Render | ![Render Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square) | [coffeely-backend.onrender.com](https://coffeely-backend.onrender.com) |
| **Database Cluster** | Neon PostgreSQL | ![PostgreSQL Status](https://img.shields.io/badge/Database-Connected-blue?style=flat-square) | Enterprise Cloud DB |

---

<div align="center">
  <sub>Built with ❤️ by the Coffeely Engineering Team. Protected by 100% Escrow & Zero-Trust Architecture.</sub>
</div>
