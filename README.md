<div align="center">

# ☕ Coffeely — Premium Companion & Social Platform

**India's #1 Safe & Verified Companion Ecosystem**
*Connect with authentic partners for coffee dates, movies, events, study sessions, and high-quality conversations.*

[![Live Website](https://img.shields.io/badge/🌐_Live_App-coffeely.vercel.app-0095f6?style=for-the-badge&logo=vercel&logoColor=white)](https://rentgf-app.vercel.app)
[![API Server](https://img.shields.io/badge/⚡_API_Server-Render_Live-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://rentgf-and-bf.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Security Status](https://img.shields.io/badge/Security-Hardened_HS256-green.svg?style=for-the-badge&logo=shield)](backend/server.js)

<br />

```
       _____ ____  ______ ______ ______ ______ _    WW 
      / ____/ __ \|  ____|  ____|  ____|  ____| |   __ 
     | |   | |  | | |__  | |__  | |__  | |__  | |  |  |
     | |   | |  | |  __| |  __| |  __| |  __| | |  |  |
     | |___| |__| | |    | |    | |____| |____| |__|  |
      \_____\____/|_|    |_|    |______|______|_____/ 
```

</div>

---

## 🌟 Key Highlights & Production Features

### 📞 1. WebRTC Peer-to-Peer HD Audio & Video Calling
- **Instant Silent Connection**: High-definition zero-lag WebRTC calling with live ringtones and native incoming/outgoing call overlays.
- **In-Call Controls**: Flip front/rear camera, toggle mute/unmute, disable video feed, and real-time duration counter.

### 💬 2. Real-Time Socket.io Chat Engine
- **Instant Messaging**: Real-time bi-directional chat with live typing indicators (`typing...`) and online/offline status pulses.
- **Rich Media & Controls**: Image sharing with full screen lightbox, star favorite messages, block user, report abuse, and disapearing message settings.

### 🚨 3. SOS Emergency Safety System
- **One-Tap Emergency Alert**: Instant emergency trigger sending live GPS latitude/longitude coordinates to trusted contacts and live Admin Monitoring Dashboard.
- **Trusted Contacts**: Store up to 3 validated emergency phone numbers & email addresses.

### 📅 4. Availability Calendar & Time Slot Scheduler
- **Time Slot Selection**: Morning (10am-12pm), Afternoon (1pm-3pm), Evening (4pm-6pm), Night (7pm-9pm), Late Night (9pm-11pm).
- **Double Booking Protection**: Automatic server-side slot locking — disables booked slots with `Booked 🔒` badges.

### 🎭 5. 24-Hour Ephemeral Stories
- **Daily Highlights**: Share real-time photos and status updates that automatically expire after 24 hours.
- **Instagram-Style Story Viewer**: 5-second progress bars, tap to skip left/right, press-to-pause, and creator controls.

### ❤️ 6. Saved Favorites Collection
- **1-Click Bookmark**: Save companion profiles with quick heart buttons directly from the feed or profile page.
- **Dashboard Collections**: Dedicated `Saved Favorites` tab on user dashboards for instant access.

### 🪪 7. Government KYC & Verification System
- **Profile Authenticity**: Multi-tier KYC document review system with admin approval workflows, verified badges (`✔`), and automated bad-content filtering.

### 👑 8. Super Admin Control Panel
- **Comprehensive Oversight**: Manage user freeze/unfreeze, platform suspension, report resolution, live SOS alerts, and analytical charts.

---

## 🛠️ Tech Stack & Architecture

### **Frontend**
- **Framework**: React 19 SPA (Single Page Application)
- **Styling**: Tailwind CSS (Dark Cyberpunk & Sleek Modern Aesthetics)
- **Icons**: React Icons (`fi`, `fa`, `ai`, `bs`)
- **Real-time**: `socket.io-client` & WebRTC (`RTCPeerConnection`)
- **PWA**: Installable Web App capabilities with offline caching

### **Backend**
- **Runtime**: Node.js v18+ & Express.js
- **Database**: PostgreSQL (Neon Cloud DB) with `pg.Pool` connection pooling
- **Sockets**: `socket.io` server handling rooms, status, calling, & chat
- **Email**: Brevo HTTP API (Transaction OTP Email Verification)
- **Media Cloud**: Cloudinary API with `browser-image-compression`

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
│   │   ├── AdminDashboard.jsx      # Super Admin Control Panel
│   │   ├── UnifiedLogin.jsx        # Login & Password Recovery
│   │   ├── UnifiedRegister.jsx     # Account Registration & OTP Verification
│   │   ├── NotificationsPage.jsx   # In-App Notification Center
│   │   ├── boy/                    # Boy Dashboard Components
│   │   ├── girl/                   # Companion Dashboard Components
│   │   └── shared/                 # Shared Modules (Chat, Details, Find, Stories)
│   │       ├── ChatPage.jsx        # WhatsApp-style Real-time Messaging
│   │       ├── DetailsPage.jsx     # Companion Profile & Slot Booking
│   │       ├── FindPage.jsx        # Companion Feed & Filters
│   │       ├── CallOverlay.jsx     # WebRTC Video/Audio Call Overlay
│   │       ├── SOSButton.jsx       # Emergency SOS Alert Trigger
│   │       ├── StoriesBar.jsx      # 24h Ephemeral Stories Rings Bar
│   │       └── StoryViewerModal.jsx# Fullscreen Story Player
│   └── App.js
│
├── backend/                        # Node.js & Express REST Backend
│   ├── server.js                   # Application Entry Point & Security Headers
│   ├── config/
│   │   └── db.js                   # PostgreSQL Pool & Auto Schema Migrations
│   ├── routes/
│   │   ├── authRoutes.js           # Auth, Registration, Login, OTP
│   │   ├── userRoutes.js           # Users, Favorites, Profiles, Followers
│   │   ├── bookingRoutes.js        # Bookings & Availability Slots
│   │   ├── chatRoutes.js           # Real-Time Chat Storage
│   │   ├── postRoutes.js           # Gallery Posts & Likes
│   │   ├── storyRoutes.js          # 24h Ephemeral Stories
│   │   ├── sosRoutes.js            # Emergency SOS System
│   │   └── adminRoutes.js          # Admin Controls & Moderation
│   ├── middleware/
│   │   ├── auth.js                 # JWT Authentication & Frozen Status Check
│   │   ├── rateLimiter.js          # In-Memory Request Rate Limiter
│   │   ├── sanitize.js             # XSS & Injection Sanitizer
│   │   └── contentFilter.js        # Profanity & Contact-Sharing Moderation
│   └── socket/
│       └── socket.js               # Socket.io Calling & Messaging Handler
└── README.md
```

---

## 🔒 Security Infrastructure

- 🛡️ **JWT Expiration & HS256 Whitelist**: Prevents token forgery and unauthorized payload manipulation.
- 🛡️ **Helmet & HTTP Hardening**: Injects 30+ enterprise security headers including strict HSTS & CSP.
- 🛡️ **XSS Input Sanitization**: Automatically strips `<script>`, `javascript:`, and null byte poisoning vectors.
- 🛡️ **Parameter Pollution Guard**: Neutralizes array manipulation attacks in query parameters.
- 🛡️ **Brute-Force Rate Limiting**: Multi-tier request throttling on sensitive auth endpoints.

---

## 🌐 Live Services & Deployment Links

| Component | Host Service | Status | Live Link |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | Vercel | ![Vercel Status](https://img.shields.io/badge/Status-Online-brightgreen?style=flat-square) | [coffeely.vercel.app](https://rentgf-app.vercel.app) |
| **Backend REST Server** | Render | ![Render Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square) | [rentgf-and-bf.onrender.com](https://rentgf-and-bf.onrender.com) |
| **Database Cluster** | Neon PostgreSQL | ![PostgreSQL Status](https://img.shields.io/badge/Database-Connected-blue?style=flat-square) | Enterprise Cloud DB |

---

<div align="center">

**Crafted with ❤️ by [Priyanshu Kumar Maurya](https://github.com/Priyanshu-kumar-maurya)**

</div>
