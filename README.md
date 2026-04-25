# 💖 RentGF - Find Your Perfect Companion

RentGF is a secure, private, and premium platform designed to help users find their perfect companion for coffee dates, movies, events, and meaningful conversations. Built with a modern tech stack, it ensures a seamless and interactive user experience.

## 🚀 Features

* **Smart Authentication:** OTP-based email verification with auto-role detection (Boy/Girl) upon login.
* **Role-Based Dashboards:** Dedicated and customized interfaces for both users and companions.
* **Real-Time Chat:** Instant messaging system powered by Socket.io, including read receipts and message deletion.
* **Booking System:** Complete workflow for sending, accepting, rejecting, and completing booking requests.
* **KYC Verification:** Secure ID proof upload system to ensure platform safety and build trust.
* **Dynamic Gallery:** Users can upload, view, and manage their profile pictures and gallery posts.
* **Responsive Design:** Fully optimized for mobile, tablet, and desktop viewing with advanced UI/UX components.

## 🛠️ Tech Stack

**Frontend:**
* React.js
* Tailwind CSS
* React Router DOM

**Backend:**
* Node.js & Express.js
* PostgreSQL (Neon DB)
* Socket.io (Real-time WebSockets)
* JSON Web Tokens (JWT) & Bcrypt (Security)
* Cloudinary & Multer (Image/Media Storage)
* Nodemailer (OTP & Email Services)

## ⚙️ Local Development Setup

To run this project locally, follow these steps:

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/your-username/rentgf-and-bf.git
cd rentgf-and-bf
\`\`\`

### 2. Install Dependencies
\`\`\`bash
# For Frontend
npm install

# For Backend (if in the same repo or navigate to backend folder)
cd backend
npm install
\`\`\`

### 3. Environment Variables (.env)
Create a `.env` file in your backend directory and add the following:
\`\`\`env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
\`\`\`

### 4. Run the Application
\`\`\`bash
# Start Frontend
npm start

# Start Backend
npm run server
\`\`\`

## 🌐 Live Demo
The project backend is deployed on **Render** and the frontend is hosted on **Vercel**.
*(Add your live Vercel link here later)*

---
*Built with ❤️ by Priyanshu*
