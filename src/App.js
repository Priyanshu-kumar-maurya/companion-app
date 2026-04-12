import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import HomePage from "./components/HomePage";
import AboutPage from "./components/AboutPage";
import HelpPage from "./components/HelpPage";
import GirlLogin from "./components/girl/GirlLogin";
import GirlRegister from "./components/girl/GirlRegister";
import GirlDashboard from "./components/girl/GirlDashboard";
import BoyLogin from "./components/boy/BoyLogin";
import BoyRegister from "./components/boy/BoyRegister";
import BoyDashboard from "./components/boy/BoyDashboard";
import FindPage from "./components/shared/FindPage";
import DetailsPage from "./components/shared/DetailsPage";
import ChatPage from "./components/shared/ChatPage";

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

export const GIRLS = [
  { id: 1, name: "Aisha Khan", age: 22, city: "Mumbai", rating: 4.8, reviews: 142, price: 500, tags: ["Coffee Date", "Movie", "Study Partner"], bio: "I love long conversations, art galleries, and cozy cafes.", verified: true, online: true },
  { id: 2, name: "Priya Sharma", age: 24, city: "Delhi", rating: 4.6, reviews: 98, price: 700, tags: ["Shopping", "Dinner", "Events"], bio: "Bubbly, outgoing and always up for an adventure!", verified: true, online: false },
  { id: 3, name: "Neha Gupta", age: 21, city: "Pune", rating: 4.9, reviews: 211, price: 600, tags: ["Study Partner", "Coffee Date", "Walk"], bio: "Gentle, kind and a great listener.", verified: true, online: true },
  { id: 4, name: "Riya Patel", age: 23, city: "Bangalore", rating: 4.5, reviews: 76, price: 450, tags: ["Movie", "Gaming", "Dinner"], bio: "Gamer girl who loves anime and good food!", verified: false, online: true },
  { id: 5, name: "Sara Joshi", age: 25, city: "Chennai", rating: 4.7, reviews: 133, price: 800, tags: ["Events", "Travel", "Dinner"], bio: "Sophisticated and well-traveled.", verified: true, online: false },
  { id: 6, name: "Meera Singh", age: 22, city: "Hyderabad", rating: 4.4, reviews: 55, price: 400, tags: ["Coffee Date", "Walk", "Study Partner"], bio: "Sweet, funny and easy to talk to.", verified: true, online: true },
];

function App() {
  const [page, setPage] = useState(PAGES.HOME);
  const [selectedGirl, setSelectedGirl] = useState(null);
  const [girlUser, setGirlUser] = useState(null);
  const [boyUser, setBoyUser] = useState(null);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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
        console.error("Session verification failed:", err);
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
        return <HomePage setPage={setPage} />;
      case PAGES.ABOUT:
        return <AboutPage />;
      case PAGES.HELP:
        return <HelpPage />;
      case PAGES.GIRL_LOGIN:
        return <GirlLogin setPage={setPage} setGirlUser={setGirlUser} />;
      case PAGES.GIRL_REGISTER:
        return <GirlRegister setPage={setPage} setGirlUser={setGirlUser} />;
      case PAGES.GIRL_DASHBOARD:
        return girlUser ? <GirlDashboard user={girlUser} setGirlUser={setGirlUser} setPage={setPage} socket={socket} setSelectedGirl={setSelectedGirl} /> : <GirlLogin setPage={setPage} setGirlUser={setGirlUser} />;
      case PAGES.BOY_LOGIN:
        return <BoyLogin setPage={setPage} setBoyUser={setBoyUser} />;
      case PAGES.BOY_REGISTER:
        return <BoyRegister setPage={setPage} setBoyUser={setBoyUser} />;
      case PAGES.BOY_DASHBOARD:
        return boyUser ? <BoyDashboard user={boyUser} setBoyUser={setBoyUser} setPage={setPage} socket={socket} setSelectedGirl={setSelectedGirl} /> : <BoyLogin setPage={setPage} setBoyUser={setBoyUser} />;
      case PAGES.FIND:
        return <FindPage setPage={setPage} setSelectedGirl={setSelectedGirl} currentUser={boyUser || girlUser} />;
      case PAGES.DETAILS:
        return selectedGirl ? <DetailsPage girl={selectedGirl} setPage={setPage} /> : <FindPage setPage={setPage} setSelectedGirl={setSelectedGirl} />;
      case PAGES.CHAT:
        return selectedGirl ? <ChatPage girl={selectedGirl} currentUser={boyUser || girlUser} setPage={setPage} /> : <FindPage setPage={setPage} setSelectedGirl={setSelectedGirl} />;
      default:
        return <HomePage setPage={setPage} />;
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