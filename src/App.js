import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import HomePage from "./components/HomePage";
import AboutPage from "./components/AboutPage";
import HelpPage from "./components/HelpPage";
import GirlDashboard from "./components/girl/GirlDashboard";
import BoyDashboard from "./components/boy/BoyDashboard";
import AdminDashboard from "./components/AdminDashboard";
import FindPage from "./components/shared/FindPage";
import DetailsPage from "./components/shared/DetailsPage";
import ChatPage from "./components/shared/ChatPage";
import MessagesPage from "./components/shared/MessagesPage";
import UnifiedRegister from "./components/UnifiedRegister";
import UnifiedLogin from "./components/UnifiedLogin";
import NotificationsPage from "./components/NotificationsPage";
import LegalPages from "./components/shared/LegalPages";
import PWAInstallBanner from "./components/shared/PWAInstallBanner";
import { io } from "socket.io-client";

const socket = io("https://rentgf-and-bf.onrender.com", {
  transports: ['websocket']
});

export const PAGES = {
  HOME: "home",
  ABOUT: "about",
  HELP: "help",
  GIRL_LOGIN: "girl_login",
  GIRL_REGISTER: "girl_register",
  GIRL_DASHBOARD: "girl_dashboard",
  BOY_LOGIN: "boy_login",
  BOY_REGISTER: "boy_register",
  BOY_DASHBOARD: "boy_dashboard",
  ADMIN_DASHBOARD: "admin_dashboard",
  FIND: "find",
  DETAILS: "details",
  CHAT: "chat",
  MESSAGES: "messages",
  NOTIFICATIONS: "notifications",
  LEGAL: "legal",
};

function App() {
  const [page, setPage] = useState(PAGES.HOME);
  const [selectedGirl, setSelectedGirl] = useState(null);
  const [girlUser, setGirlUser] = useState(null);
  const [boyUser, setBoyUser] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [globalAlert, setGlobalAlert] = useState(null);

  useEffect(() => {
    window.alert = (msg) => {
      setGlobalAlert({
        message: msg,
        type: 'alert',
        onConfirm: () => setGlobalAlert(null)
      });
    };

    window.showConfirm = (msg) => {
      return new Promise((resolve) => {
        setGlobalAlert({
          message: msg,
          type: 'confirm',
          onConfirm: () => {
            setGlobalAlert(null);
            resolve(true);
          },
          onCancel: () => {
            setGlobalAlert(null);
            resolve(false);
          }
        });
      });
    };
  }, []);

  // ── Server Wake-Up Ping (Render free tier sleeps after 15 min) ──
  useEffect(() => {
    const wakeUpServer = async () => {
      try {
        await fetch("https://rentgf-and-bf.onrender.com/", { method: "GET" });
      } catch (e) {
        // Silently ignore — just a wake-up ping
      }
    };
    wakeUpServer();
    // Ping every 10 minutes to keep server awake during active session
    const interval = setInterval(wakeUpServer, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash.replace("#", "");
      if (currentHash) {
        setPage(currentHash);
      } else {
        setPage(PAGES.HOME);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (window.location.hash !== `#${page}`) {
      window.history.pushState(null, "", `#${page}`);
    }
  }, [page]);

  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        const response = await fetch("https://rentgf-and-bf.onrender.com/api/me", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();

          if (userData.role === "admin") {
            setAdminUser(userData);
            setPage(PAGES.ADMIN_DASHBOARD);
          } else if (userData.role === "boy") {
            setBoyUser(userData);
            setPage(PAGES.BOY_DASHBOARD);
          } else if (userData.role === "girl") {
            setGirlUser(userData);
            setPage(PAGES.GIRL_DASHBOARD);
          }
        } else {
          localStorage.removeItem("token");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    verifySession();
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="min-h-[100dvh] bg-[#0D0D1A] flex flex-col items-center justify-center gap-6 text-white">
        <div className="relative">
          <svg className="w-16 h-16 animate-spin drop-shadow-[0_0_12px_rgba(236,72,153,0.6)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animationDuration: '2.5s' }}>
            <path d="M49.9999 15L23.157 30.5V61.5L49.9999 77L76.8428 61.5V30.5L49.9999 15Z" stroke="url(#loader-ai-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M49.9999 35L36.1436 43V59L49.9999 67L63.8563 59V43L49.9999 35Z" stroke="url(#loader-ai-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M23 30.5L50 50M77 30.5L50 50M50 77V50" stroke="url(#loader-ai-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="loader-ai-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ec4899" />
                <stop offset="1" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="text-base font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent animate-pulse tracking-wide">
          Loading your dating experience...
        </div>
      </div>
    );
  }

  const currentUser = boyUser || girlUser || adminUser;

  const renderPage = () => {
    switch (page) {
      case PAGES.HOME:
        return <HomePage setPage={setPage} currentUser={currentUser} setSelectedGirl={setSelectedGirl} />;
      case PAGES.ABOUT:
        return <AboutPage />;
      case PAGES.HELP:
        return <HelpPage />;
      case PAGES.MESSAGES:
        return currentUser ? <MessagesPage currentUser={currentUser} setPage={setPage} setSelectedGirl={setSelectedGirl} socket={socket} /> : <UnifiedLogin setPage={setPage} />;
      case PAGES.NOTIFICATIONS:
        return currentUser ? <NotificationsPage currentUser={currentUser} setPage={setPage} setSelectedGirl={setSelectedGirl} /> : <UnifiedLogin setPage={setPage} />;
      case PAGES.GIRL_LOGIN:
        return <UnifiedLogin setPage={setPage} setGirlUser={setGirlUser} setBoyUser={setBoyUser} setAdminUser={setAdminUser} defaultRole="girl" />;
      case PAGES.BOY_LOGIN:
        return <UnifiedLogin setPage={setPage} setGirlUser={setGirlUser} setBoyUser={setBoyUser} setAdminUser={setAdminUser} defaultRole="boy" />;
      case PAGES.GIRL_REGISTER:
      case PAGES.BOY_REGISTER:
        return <UnifiedRegister setPage={setPage} />;
      case PAGES.GIRL_DASHBOARD:
        return girlUser ? <GirlDashboard user={girlUser} setGirlUser={setGirlUser} setPage={setPage} socket={socket} setSelectedGirl={setSelectedGirl} /> : <UnifiedLogin setPage={setPage} setGirlUser={setGirlUser} setBoyUser={setBoyUser} defaultRole="girl" />;
      case PAGES.BOY_DASHBOARD:
        return (boyUser || adminUser) ? <BoyDashboard user={boyUser || adminUser} setBoyUser={setBoyUser} setPage={setPage} socket={socket} setSelectedGirl={setSelectedGirl} /> : <UnifiedLogin setPage={setPage} setGirlUser={setGirlUser} setBoyUser={setBoyUser} defaultRole="boy" />;
      case PAGES.ADMIN_DASHBOARD:
        return adminUser ? <AdminDashboard user={adminUser} setPage={setPage} /> : <UnifiedLogin setPage={setPage} />;
      case PAGES.FIND:
        return <FindPage setPage={setPage} setSelectedGirl={setSelectedGirl} currentUser={currentUser} />;
      case PAGES.DETAILS:
        return selectedGirl ? <DetailsPage girl={selectedGirl} setPage={setPage} currentUser={currentUser} setSelectedGirl={setSelectedGirl} /> : <FindPage setPage={setPage} setSelectedGirl={setSelectedGirl} currentUser={currentUser} />;
      case PAGES.CHAT:
        return selectedGirl ? <ChatPage girl={selectedGirl} currentUser={currentUser} setPage={setPage} setSelectedGirl={setSelectedGirl} /> : <FindPage setPage={setPage} setSelectedGirl={setSelectedGirl} currentUser={currentUser} />;
      case PAGES.LEGAL:
        return <LegalPages setPage={setPage} />;
      default:
        return <HomePage setPage={setPage} currentUser={currentUser} setSelectedGirl={setSelectedGirl} />;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0D0D1A] text-white overflow-x-hidden w-full relative">
      <Navbar
        page={page}
        setPage={setPage}
        girlUser={girlUser}
        boyUser={boyUser}
        adminUser={adminUser}
        setGirlUser={setGirlUser}
        setBoyUser={setBoyUser}
        socket={socket}
      />
      {renderPage()}
      <PWAInstallBanner />
      {/* Global Alert & Confirm Dialog (Instagram Style) */}
      {globalAlert && (
        <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="bg-[#16162A] w-full max-w-[280px] rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col items-center">
            <div className="px-6 py-6 flex flex-col items-center text-center">
              <p className="text-sm text-gray-200 font-medium leading-relaxed break-words w-full">{globalAlert.message}</p>
            </div>
            <div className="w-full flex flex-col divide-y divide-white/5 border-t border-white/5">
              {globalAlert.type === 'confirm' ? (
                <>
                  <button
                    onClick={globalAlert.onConfirm}
                    className="w-full py-3.5 text-center text-sm font-bold text-pink-500 hover:bg-white/5 active:bg-white/10 transition outline-none"
                  >
                    OK
                  </button>
                  <button
                    onClick={globalAlert.onCancel}
                    className="w-full py-3.5 text-center text-sm font-medium text-gray-400 hover:bg-white/5 active:bg-white/10 transition outline-none"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={globalAlert.onConfirm}
                  className="w-full py-3.5 text-center text-sm font-bold text-pink-500 hover:bg-white/5 active:bg-white/10 transition outline-none"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;