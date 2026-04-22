import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import HomePage from "./components/HomePage";
import AboutPage from "./components/AboutPage";
import HelpPage from "./components/HelpPage";
import GirlDashboard from "./components/girl/GirlDashboard";
import BoyDashboard from "./components/boy/BoyDashboard";
import FindPage from "./components/shared/FindPage";
import DetailsPage from "./components/shared/DetailsPage";
import ChatPage from "./components/shared/ChatPage";

import UnifiedRegister from "./components/UnifiedRegister";
import UnifiedLogin from "./components/UnifiedLogin"; // 🚨 YEH IMPORT MISSING THA 🚨

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
  FIND: "find",
  DETAILS: "details",
  CHAT: "chat",
};

function App() {
  const [page, setPage] = useState(PAGES.HOME);
  const [selectedGirl, setSelectedGirl] = useState(null);
  const [girlUser, setGirlUser] = useState(null);
  const [boyUser, setBoyUser] = useState(null);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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

          if (userData.role === "boy") {
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
      <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center text-white">
        <div className="text-xl font-semibold text-pink-500 animate-pulse">
          Loading your dating experience... 💕
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (page) {
      case PAGES.HOME:
        return <HomePage setPage={setPage} currentUser={boyUser || girlUser} />;
      case PAGES.ABOUT:
        return <AboutPage />;
      case PAGES.HELP:
        return <HelpPage />;

      case PAGES.GIRL_LOGIN:
        return <UnifiedLogin setPage={setPage} setGirlUser={setGirlUser} setBoyUser={setBoyUser} defaultRole="girl" />;
      case PAGES.BOY_LOGIN:
        return <UnifiedLogin setPage={setPage} setGirlUser={setGirlUser} setBoyUser={setBoyUser} defaultRole="boy" />;

      case PAGES.GIRL_REGISTER:
      case PAGES.BOY_REGISTER:
        return <UnifiedRegister setPage={setPage} />;

      case PAGES.GIRL_DASHBOARD:
        return girlUser ? <GirlDashboard user={girlUser} setGirlUser={setGirlUser} setPage={setPage} socket={socket} setSelectedGirl={setSelectedGirl} /> : <UnifiedLogin setPage={setPage} setGirlUser={setGirlUser} setBoyUser={setBoyUser} defaultRole="girl" />;
      case PAGES.BOY_DASHBOARD:
        return boyUser ? <BoyDashboard user={boyUser} setBoyUser={setBoyUser} setPage={setPage} socket={socket} setSelectedGirl={setSelectedGirl} /> : <UnifiedLogin setPage={setPage} setGirlUser={setGirlUser} setBoyUser={setBoyUser} defaultRole="boy" />;

      case PAGES.FIND:
        return <FindPage setPage={setPage} setSelectedGirl={setSelectedGirl} currentUser={boyUser || girlUser} />;
      case PAGES.DETAILS:
        return selectedGirl ? <DetailsPage girl={selectedGirl} setPage={setPage} currentUser={boyUser || girlUser} /> : <FindPage setPage={setPage} setSelectedGirl={setSelectedGirl} currentUser={boyUser || girlUser} />;
      case PAGES.CHAT:
        return selectedGirl ? <ChatPage girl={selectedGirl} currentUser={boyUser || girlUser} setPage={setPage} setSelectedGirl={setSelectedGirl} /> : <FindPage setPage={setPage} setSelectedGirl={setSelectedGirl} currentUser={boyUser || girlUser} />;
      default:
        return <HomePage setPage={setPage} currentUser={boyUser || girlUser} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D1A] text-white">
      <Navbar
        page={page}
        setPage={setPage}
        girlUser={girlUser}
        boyUser={boyUser}
        setGirlUser={setGirlUser}
        setBoyUser={setBoyUser}
      />
      {renderPage()}
    </div>
  );
}

export default App;