# Coffeely

> Safe, verified companion booking & social interaction platform built with React, Node.js, Socket.IO, WebRTC, and PostgreSQL.

[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel)](https://coffeely-app.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://coffeely-backend.onrender.com)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_Neon-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Node](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## Overview

Coffeely connects users for verified social outings — coffee meetups, movie companions, study sessions, event partners, and high-quality conversations.

The platform is designed with safety, transparency, and user privacy at its core. It incorporates an automated escrow payment mechanism to hold booking funds until dates conclude, verified client review tags, a one-tap emergency SOS broadcast system, WhatsApp-inspired PIN-locked and hidden private chats, real-time WebRTC audio/video calling, and interactive proximity-based companion discovery on live maps.

---

## Table of Contents

- [Core Features](#-core-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
  - [Environment Variables](#environment-variables)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Security Model](#-security-model)
- [License](#-license)

---

## 🚀 Core Features

### 1. 🛡️ Escrow Booking & Wallet Ledger
- **Escrow Guarantee**: When a user books a companion, the session fee is safely held in escrow.
- **Auto Release & Refunds**: Funds are automatically released into the companion's available wallet once the session is marked completed, or 100% refunded if rejected or canceled.
- **Companion Withdrawals**: Companions can request instant payouts directly to their UPI ID or Bank Account (IMPS/NEFT) with real-time audit ledger tracking.
- **Tax Invoices**: Auto-generates downloadable and printable digital PDF receipts with unique Invoice IDs and breakdown details.

### 2. 📞 WebRTC Audio & Video Calling
- Direct peer-to-peer HD voice and video calling powered by WebRTC and Socket.IO signaling.
- Native incoming/outgoing call popups with custom audio ringtones, mute/unmute toggles, camera flipping, and real-time duration counters.

### 3. 💬 Real-Time Messaging & Privacy
- **Instant Messaging**: Real-time Socket.IO chat with live typing indicators, delivery receipts, and online presence.
- **PIN-Locked Chats**: Protect sensitive conversations behind a custom 4-digit PIN.
- **Ghost Mode (Hidden Chats)**: Completely conceal private chats from the main inbox list, revealable only by searching `#YOUR_PIN` in the search bar.

### 4. 🗺️ Interactive Proximity Discovery
- Interactive OpenStreetMap and Leaflet integration.
- Filter companions by radius (5km, 10km, 25km, 50km) with automatic distance calculation (Haversine formula) and instant profile preview cards.

### 5. ⭐ Reviews & Verified Client Badges
- Post-session 5-star rating system with aggregate distribution analytics (5★–1★).
- **Verified Client Tag**: Badges awarded exclusively to clients who completed an actual booked session.
- Compliment chips (*"Great Listener"*, *"Punctual"*, *"Super Polite"*, *"Fun & Energetic"*).
- Helpful vote counters on individual reviews.

### 6. 🚨 SOS Emergency System
- One-tap emergency broadcast sending live GPS coordinates (latitude/longitude) to trusted emergency contacts and the live Admin Safety Console.

### 7. 🎭 24-Hour Stories & Gallery
- Ephemeral photo and status stories that expire after 24 hours.
- Instagram-style story viewer with touch-and-hold pause, tap to advance, and progress indicators.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Description |
| :--- | :--- |
| **React 19** | Modern UI framework with hooks and functional architecture |
| **Tailwind CSS** | Custom responsive dark glassmorphism styling |
| **Socket.IO Client** | Bi-directional communication for chats, status, and notifications |
| **WebSockets / WebRTC** | `RTCPeerConnection` for low-latency peer-to-peer audio & video calls |
| **Leaflet & OpenStreetMap** | Interactive mapping and proximity searches |
| **React Icons** | Feather (`fi`), FontAwesome (`fa`), and Bootstrap (`bs`) icon suites |
| **Browser Image Compression** | Client-side compression before Cloudinary upload |

### Backend
| Technology | Description |
| :--- | :--- |
| **Node.js & Express** | RESTful API server with modular routing |
| **PostgreSQL (Neon)** | Cloud relational database with connection pooling (`pg.Pool`) |
| **Socket.IO Server** | Real-time signaling server for messaging, calls, and status |
| **Brevo HTTP API** | Transactional email delivery for OTP verification and password resets |
| **Cloudinary** | Cloud storage for profiles, post media, and stories |
| **Razorpay API** | Integrated payment orders and webhook verification |

---

## 📐 System Architecture

```
[ Client Browser / PWA (React) ]
             │
             ├── HTTP / REST API ──> [ Express.js Backend Server ]
             │                                   │
             │                                   ├── PostgreSQL Database (Neon Pool)
             │                                   ├── Brevo API (Transactional Emails)
             │                                   ├── Cloudinary (Image Hosting)
             │                                   └── Razorpay (Escrow Gateways)
             │
             ├── WebSocket (Socket.IO) ─> [ Signaling & Chat Rooms ]
             │
             └── P2P Audio / Video Stream (WebRTC Mesh) ──> [ Peer Client ]
```

---

## 💻 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- PostgreSQL database URL (Neon, Supabase, or local instance)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Priyanshu-kumar-maurya/companion-app.git
   cd companion-app
   ```

2. **Install Frontend Dependencies:**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   cd ..
   ```

### Environment Variables

Create a `.env` file in the `backend/` directory with the following configuration:

```env
# Server
PORT=5000

# Database (PostgreSQL / Neon)
DATABASE_URL=postgres://your_user:your_password@ep-your-instance.neon.tech/neondb?sslmode=require

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Brevo HTTP API (Emails & OTP)
BREVO_API_KEY=your_brevo_api_key
EMAIL_USER=noreply@coffeely.com
EMAIL_FROM_NAME=Coffeely

# Cloudinary (Media Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Razorpay (Optional - Payments)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

Create a `.env` file in the root directory for the React frontend (optional for local testing):
```env
REACT_APP_API_URL=http://localhost:5000
```

### Running Locally

Start both servers concurrently or in separate terminals:

```bash
# Terminal 1: Backend Server (runs on port 5000)
cd backend
npm start

# Terminal 2: React Frontend (runs on port 3000)
npm start
```

Open `http://localhost:3000` in your browser.

---

## 📡 API Reference

### Authentication (`/api`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/register` | Register new user & dispatch OTP email | No |
| `POST` | `/login` | Authenticate user & receive JWT token | No |
| `POST` | `/verify-otp` | Verify registration OTP code | No |
| `POST` | `/forgot-password` | Request password reset OTP | No |
| `POST` | `/reset-password` | Set new password with valid OTP | No |

### Users & Profiles (`/api`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/users` | Fetch list of active companion profiles | No |
| `GET` | `/users/:id` | Fetch specific user details | No |
| `PUT` | `/profile` | Update current user profile info | Yes |
| `POST` | `/favorites/toggle` | Add/remove companion to favorites | Yes |
| `GET` | `/favorites` | Get authenticated user's saved list | Yes |

### Bookings & Escrow (`/api`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/bookings` | Create new booking session with time slot | Yes |
| `GET` | `/bookings/my` | Fetch user's incoming/outgoing bookings | Yes |
| `PUT` | `/bookings/:id` | Update status (`accepted`, `completed`, `rejected`) | Yes |
| `POST` | `/payment/create-order` | Calculate safety fees and create escrow order | Yes |
| `POST` | `/payment/verify` | Capture payment and lock into companion escrow | Yes |
| `POST` | `/wallet/payout-request` | Submit UPI or Bank transfer withdrawal request | Yes |

### Reviews & Ratings (`/api`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/reviews/:companionId` | Get companion reviews, star breakdown, and highlights | No |
| `POST` | `/reviews` | Submit star rating with verified client check | Yes |
| `POST` | `/reviews/:id/helpful` | Toggle helpful vote on a review | Yes |

---

## 🗄️ Database Schema

The database runs on PostgreSQL and manages schema migrations automatically on startup (`backend/config/db.js`).

- **`users`**: Auth credentials, KYC status, profile metadata, hourly rates, location coordinates, security lockout state.
- **`bookings`**: Booking time slots, companion/client IDs, status, payment status, platform fee, and companion earnings.
- **`wallet_balances`**: Available balance, pending escrow funds, total withdrawn, lifetime earnings.
- **`wallet_transactions`**: Complete audit trail of escrow deposits, releases, withdrawals, and refunds.
- **`payout_requests`**: Bank and UPI withdrawal records with admin approval notes and UTR references.
- **`reviews`**: Ratings (1–5), comments, verified client booking flags, compliment tag arrays, and helpful vote counts.
- **`messages`**: Real-time chat messages, media attachments, read receipts, and timestamps.
- **`stories`**: Ephemeral photo stories with auto-expiration (24 hours).
- **`sos_alerts`**: Emergency records with live GPS location coordinates and resolution state.

---

## 🔒 Security Model

- **Authentication**: Stateless JSON Web Tokens (JWT) signed with strict `HS256` validation and auto-expiration.
- **Password Security**: Salted password hashing with `bcryptjs` (12 salt rounds).
- **CSPRNG OTP Engine**: One-time codes generated via Node.js `crypto.randomInt` with timing-safe comparison (`crypto.timingSafeEqual`).
- **Account Lockout**: 15-minute temporary lockout triggered after 5 consecutive failed login attempts.
- **Slowloris & HTTP Protection**: Hardened HTTP server keepalive and header timeouts to prevent slow connection denial-of-service attacks.
- **Content Sanitization**: Multi-tier input sanitization stripping null bytes, XSS payloads, script tags, and malicious markup.
- **Security Headers**: Injected via Helmet (`HSTS`, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Cross-Origin-Opener-Policy`).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
