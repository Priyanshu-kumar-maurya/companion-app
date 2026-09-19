# Coffeely ☕

> Safe, verified companion booking and real-time social interaction platform built with React, Node.js, Socket.IO, WebRTC, PostgreSQL, and Capacitor (Android Native).

[![Download Android APK](https://img.shields.io/badge/📥_Download-Coffeely_APK_(v2.4.1)-FF4B4B?style=for-the-badge&logo=android&logoColor=white)](https://github.com/Priyanshu-kumar-maurya/companion-app/releases/latest/download/coffeely.apk)
[![GitHub Releases](https://img.shields.io/badge/📦_GitHub-Releases-7952b3?style=for-the-badge&logo=github)](https://github.com/Priyanshu-kumar-maurya/companion-app/releases)

[![Version](https://img.shields.io/badge/Version-v2.4.1_(Latest)-10B981?style=flat-square)](src/config/version.js)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel)](https://coffeely-app.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://rentgf-and-bf.onrender.com)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_Neon-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android_Native-119EFF?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com)
[![Node](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 📱 Android App Download (APK)

Get the official **Coffeely** Android app directly on your mobile device!

### 📥 Direct Download Links:
* 🚀 **[Download coffeely.apk (Latest v2.4.1)](https://github.com/Priyanshu-kumar-maurya/companion-app/releases/latest/download/coffeely.apk)** *(Direct APK file for phone)*
* 📦 **[Browse All Releases & Versions](https://github.com/Priyanshu-kumar-maurya/companion-app/releases)**

### 🛠️ App Specifications:
| Specification | Details |
| :--- | :--- |
| **App Name** | **Coffeely** |
| **Package ID** | `com.coffeely.app` |
| **File Name** | `coffeely.apk` |
| **App Version** | `v2.4.1` |
| **Compatible OS** | Android 7.0 (Nougat) to Android 15+ (API 24 - 35) |
| **Permissions** | Camera, Microphone, Internet, Audio (for Video & Voice Calling) |

### 📲 How to Install on Android (आसान तरीका):
1. **Download APK**: Upar diye gaye **[Download coffeely.apk](https://github.com/Priyanshu-kumar-maurya/companion-app/releases/latest/download/coffeely.apk)** link par click karein.
2. **Open File**: Download hone ke baad notification panel ya mobile ke `Downloads` folder se `coffeely.apk` file par tap karein.
3. **Allow Permission**: Agar phone me *"For your security, your phone is not allowed to install unknown apps from this source"* dikhe, to **Settings** me jaakar **"Allow from this source"** enable karein.
4. **Install**: **Install** button press karein aur Coffeely app aapke phone me install ho jayega!

---

## Overview

Coffeely connects users with verified companions for social outings, coffee meetups, movie dates, event attendance, and meaningful conversations. 

The application is engineered with safety, privacy, and transparency at its foundation:
- **100% Escrow Protection**: Booking payments are held in escrow until sessions are marked completed.
- **Real-Time Communication**: P2P WebRTC audio/video calling and encrypted Socket.IO chat with voice notes.
- **Privacy & Security**: PIN-locked and hidden chats, GPS-based emergency SOS alerts, and multi-tier rate limiting.
- **Android Native & PWA Experience**: Installable as a native Android APK (`coffeely.apk`) and across desktop/mobile browsers.

---

## Table of Contents

- [📱 Android App Download (APK)](#-android-app-download-apk)

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
  - [Environment Variables](#environment-variables)
- [Security Architecture](#-security-architecture)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [License](#-license)

---

## 🚀 Key Features

### 1. 🛡️ Escrow Booking & Wallet Ledger
- **Payment Escrow**: Client payments are locked in an escrow holding account upon booking confirmation.
- **Automated Settlement**: Escrow funds automatically transfer to the companion's available balance upon session completion. Cancellations or rejections initiate a 100% refund.
- **Payouts**: Companions can request direct withdrawals to their UPI ID or Bank Account (IMPS/NEFT) with real-time ledger tracking.
- **Digital Invoices**: Instant generation and printing of itemized transaction receipts with breakdown fees.

### 2. 📞 WebRTC Audio & Video Calling
- Direct peer-to-peer audio and video calls powered by WebRTC and Socket.IO signaling.
- Native incoming/outgoing ringing popups, audio ringtones, camera toggling, mic mute, and live call timers.

### 3. 💬 Real-Time Chat & Voice Notes
- **Instant Messaging**: Low-latency Socket.IO messaging with live typing indicators and delivery statuses.
- **Voice Notes**: In-browser audio recording, compression, and waveform playback directly inside chat rooms.
- **PIN-Locked Conversations**: Lock sensitive chats with a personal 4-digit PIN.
- **Ghost Mode (Hidden Chats)**: Conceal private chats from the main inbox list, accessible only by typing `#YOUR_PIN` into the search bar.

### 4. 🚨 SOS Emergency System
- One-tap emergency broadcast that transmits live GPS coordinates (latitude/longitude) to configured emergency contacts and the live Admin Console.

### 5. 🗺️ Proximity Map & Discovery
- Interactive OpenStreetMap integration with Leaflet.
- Search companions by distance radius (5km, 10km, 25km, 50km) with automatic distance calculation (Haversine algorithm).

### 6. ⭐ Verified Client Reviews & Ratings
- Post-session rating system (1★ to 5★) with distribution statistics.
- **Verified Client Tag**: Displayed exclusively on reviews left by users with confirmed, completed bookings.
- Compliment badges (*Punctual*, *Great Listener*, *Super Polite*) and helpful vote tracking.

### 7. 📱 PWA Native Installation & Version Engine
- Progressive Web App support for Android, iOS, Windows, and macOS.
- Built-in App Version & Update monitor in Settings (`v2.4.0 Latest`) that detects device platforms and validates cache updates.

---

## 🛠️ Tech Stack

### Frontend
- **React 19** with modern functional hooks architecture
- **Tailwind CSS** with dark glassmorphism styling
- **Socket.IO Client** for real-time messaging, status, and notifications
- **WebRTC (`RTCPeerConnection`)** for peer-to-peer audio and video streaming
- **Leaflet & OpenStreetMap** for live geographic companion discovery
- **React Icons** (Feather, FontAwesome, Bootstrap suites)

### Backend
- **Node.js & Express 5** RESTful API server
- **PostgreSQL (Neon)** with connection pooling (`pg.Pool`)
- **Socket.IO Server** with JWT handshake authentication
- **Brevo HTTP API** for transactional email delivery and OTP verification
- **Cloudinary & Multer** for image, voice note, and video hosting
- **Helmet & CORS** with strict domain whitelisting

---

## 📐 System Architecture

```
[ Web Browser / PWA Client ]
             │
             ├── HTTPS REST API ──> [ Express Backend Server ]
             │                                   │
             │                                   ├── PostgreSQL Database (Neon Pool)
             │                                   ├── Brevo API (OTP & System Emails)
             │                                   ├── Cloudinary (Media Storage)
             │                                   └── Razorpay (Escrow Gateways)
             │
             ├── WebSocket (WSS) ──> [ Socket.IO Signaling & Rooms ]
             │
             └── P2P Media Stream ─> [ WebRTC Mesh Audio/Video ]
```

---

## 🔒 Security Architecture

Coffeely enforces a multi-layer defense strategy across all endpoints:

1. **Insecure Direct Object Reference (IDOR) Prevention**:
   - Strict ownership checks on wallet balances, transactions, and payout requests (`req.user.id === userId` or `admin`).
   - Escrow release and refund operations require verified participation in the specific booking.

2. **File Upload Hardening**:
   - Multer limits file sizes to **10MB** to prevent Denial-of-Service (DoS) and memory exhaustion.
   - Dangerous file extensions (`.exe`, `.sh`, `.php`, `.py`, `.svg`, `.html`, `.js`, etc.) are blocked immediately.
   - Strict MIME-type checking ensures only valid images, videos, and audio notes are processed.

3. **WebSocket JWT Handshake**:
   - Socket connections require a valid JWT token signature during handshake.
   - Message and call handlers enforce caller identity matching, preventing sender impersonation.
   - Per-socket rate limiting prevents message flooding and bot automation.

4. **Origin & CORS Validation**:
   - CORS origin validation rejects arbitrary third-party domains and restricts access to official deployment hosts.

5. **Authentication & Cryptography**:
   - Passwords hashed with `bcryptjs` (12 salt rounds).
   - OTP codes generated using cryptographically secure pseudorandom numbers (`crypto.randomInt`) and compared using constant-time checks (`crypto.timingSafeEqual`).
   - Account lockout mechanism temporarily freezes logins for 15 minutes after 5 consecutive failed attempts.

6. **Network & Proxy Protection**:
   - Correct client IP extraction behind reverse proxies (`x-forwarded-for`).
   - Rate limiting on auth (5 req/min), payment/wallet (25 req/min), and global routes (120 req/min).
   - HTTP security headers injected via Helmet (`HSTS`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).

---

## 💻 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- PostgreSQL database instance (Neon, Supabase, or local)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Priyanshu-kumar-maurya/companion-app.git
   cd companion-app
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   cd ..
   ```

### Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
# Server
PORT=5000

# Database
DATABASE_URL=postgres://user:password@ep-instance.neon.tech/neondb?sslmode=require

# JWT
JWT_SECRET=your_strong_jwt_secret_key

# Email Service (Brevo HTTP API)
BREVO_API_KEY=your_brevo_api_key
EMAIL_USER=noreply@coffeely.com
EMAIL_FROM_NAME=Coffeely

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay (Optional)
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

### Running the Application

```bash
# Terminal 1: Backend Server (Port 5000)
cd backend
npm start

# Terminal 2: React Frontend (Port 3000)
npm start
```

Navigate to `http://localhost:3000` in your browser.

---

## 📡 API Reference

### Authentication (`/api`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/register` | Create account & send email OTP | No |
| `POST` | `/login` | Authenticate credentials & return JWT | No |
| `POST` | `/verify-otp` | Validate verification code | No |
| `POST` | `/forgot-password` | Request password reset code | No |
| `POST` | `/reset-password` | Reset password using valid OTP | No |

### Profiles & Users (`/api`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/users` | Browse active companion profiles | No |
| `GET` | `/me` | Get authenticated user profile | Yes |
| `PUT` | `/users/:userId` | Update profile settings (Owner only) | Yes |
| `DELETE` | `/users/:userId` | Delete account permanently | Yes |

### Bookings & Payments (`/api`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/bookings` | Create new booking session | Yes |
| `POST` | `/payment/create-order` | Generate escrow payment order | Yes |
| `POST` | `/payment/verify` | Verify payment and lock into escrow | Yes |
| `POST` | `/payment/release-escrow/:id`| Release escrow to companion balance | Yes |
| `POST` | `/payment/refund-escrow/:id` | Process 100% cancellation refund | Yes |
| `GET` | `/wallet/:userId` | View available & escrow balance | Yes |
| `POST` | `/wallet/payout-request` | Submit UPI / Bank withdrawal | Yes |

### Safety & Reviews (`/api`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/sos/trigger` | Broadcast emergency SOS with GPS coordinates | Yes |
| `GET` | `/sos/emergency-contacts` | Fetch configured emergency contacts | Yes |
| `POST` | `/reviews` | Post companion review (Verified clients) | Yes |
| `GET` | `/call-history/:userId` | Retrieve voice & video call history | Yes |

---

## 🗄️ Database Schema

Schema migrations and table initializations run automatically on server boot (`backend/config/db.js`):

- **`users`**: Authentication credentials, KYC state, hourly fees, GPS coordinates, lockout counters.
- **`bookings`**: Session details, status (`pending`, `accepted`, `completed`), payment status, platform fee breakdown.
- **`wallet_balances`**: Available balance, pending escrow funds, total withdrawn, lifetime earnings.
- **`wallet_transactions`**: Complete audit log for escrow deposits, releases, withdrawals, and refunds.
- **`payout_requests`**: Bank and UPI payout queues with admin approval tracking and reference IDs.
- **`messages`**: Real-time chat messages, media URLs, audio notes, and read receipts.
- **`call_history`**: Voice and video call logs with duration and status.
- **`sos_alerts`**: Emergency records with live coordinates and resolution tracking.
- **`reviews`**: 1–5 star ratings, compliment chips, and verified client flags.

---

## 📄 License

Distributed under the [MIT License](LICENSE).
