import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import api from "./lib/axios";
import { Toaster } from "react-hot-toast";

const App = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Initializing theme state from localStorage
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("docket-theme") || "light";
  });

  useEffect(() => {
    localStorage.setItem("docket-theme", theme);
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.setAttribute("data-theme", theme);
  }, [theme]);

  // Verifying authentication session on application startup
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("docket-token");
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const res = await api.get("/auth/me");
        setUser(res.data);
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("docket-token");
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Rendering loading screen during authentication checks
  if (authLoading) {
    return (
      <div data-theme={theme} className={`min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#09090B] ${theme === "dark" ? "dark" : ""}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 animate-pulse">
            <span className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white uppercase font-sans">
              Docket
            </span>
            <div className="size-2 bg-[#FF9E79] rounded-full" />
          </div>
          <div className="size-7 border-3 border-[#B386FF] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Redirecting to registration/login panel when unauthenticated
  if (!user) {
    return (
      <div data-theme={theme} className={theme === "dark" ? "dark" : ""}>
        <AuthPage setUser={setUser} theme={theme} setTheme={setTheme} />
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            className: "font-sans font-semibold rounded-2xl p-4 shadow-xl border border-black/5 dark:border-white/5",
            style: {
              borderRadius: "1.2rem",
              background: theme === "dark" ? "#1E1E20" : "#FFFFFF",
              color: theme === "dark" ? "#FFFFFF" : "#1A1A1A",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }
          }} 
        />
      </div>
    );
  }

  return (
    <div data-theme={theme} className={`min-h-screen transition-colors duration-300 ${theme === "dark" ? "dark" : ""}`}>
      <Routes>
        <Route path="/" element={<HomePage user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
        <Route path="/create" element={<HomePage user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
        <Route path="/note/:id" element={<HomePage user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
      </Routes>
      
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          className: "font-sans font-semibold rounded-2xl p-4 shadow-xl border border-black/5 dark:border-white/5",
          style: {
            borderRadius: "1.2rem",
            background: theme === "dark" ? "#1E1E20" : "#FFFFFF",
            color: theme === "dark" ? "#FFFFFF" : "#1A1A1A",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          }
        }} 
      />
    </div>
  );
};

export default App;