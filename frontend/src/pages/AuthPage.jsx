import { useState, useEffect } from "react";
import { Mail, Lock, User, Sparkles, Eye, EyeOff, Sun, Moon } from "lucide-react";
import api from "../lib/axios";
import toast from "react-hot-toast";

const AuthPage = ({ setUser, theme, setTheme }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all credentials");
      return;
    }

    // 1. Validate Email (Login & Register)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!isLogin) {
      // 2. Validate Name
      if (!name.trim()) {
        toast.error("Please provide your name");
        return;
      }
      if (name.trim().length < 2) {
        toast.error("Name must be at least 2 characters long");
        return;
      }
      const nameRegex = /^[a-zA-Z\s\-]+$/;
      if (!nameRegex.test(name.trim())) {
        toast.error("Name can only contain letters, spaces, and hyphens");
        return;
      }

      // 3. Validate Password Strength (Register Only)
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters long");
        return;
      }
      if (!/[A-Z]/.test(password)) {
        toast.error("Password must contain at least one uppercase letter");
        return;
      }
      if (!/[a-z]/.test(password)) {
        toast.error("Password must contain at least one lowercase letter");
        return;
      }
      if (!/[0-9]/.test(password)) {
        toast.error("Password must contain at least one number");
        return;
      }
      if (!/[@$!%*?&#]/.test(password)) {
        toast.error("Password must contain at least one special character (@, $, !, %, *, ?, &, #)");
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Log In
        const res = await api.post("/auth/login", { email: email.trim(), password: password.trim() });
        localStorage.setItem("docket-token", res.data.token);
        toast.success(`Welcome back, ${res.data.name}!`);
        setUser(res.data);
      } else {
        // Sign Up
        const res = await api.post("/auth/signup", {
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
        });
        localStorage.setItem("docket-token", res.data.token);
        toast.success(`Account created! Welcome, ${res.data.name}!`);
        setUser(res.data);
      }
    } catch (error) {
      console.error("Authentication failed", error);
      toast.error(error.response?.data?.message || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Google Identity Service live credential response
  const handleGoogleCredentialResponse = async (response) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/google", {
        credential: response.credential
      });
      localStorage.setItem("docket-token", res.data.token);
      toast.success(`Welcome, ${res.data.name}!`);
      setUser(res.data);
    } catch (error) {
      console.error("Google Auth failed", error);
      toast.error(error.response?.data?.message || "Google authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // Initialize and Render live Google button
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const initGoogleBtn = () => {
      if (window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
          });

          window.google.accounts.id.renderButton(
            document.getElementById("real-google-btn"),
            { 
              theme: theme === "dark" ? "filled_black" : "outline", 
              size: "large",
              shape: "pill",
              width: "360"
            }
          );
        } catch (err) {
          console.error("Failed to initialize Google button:", err);
        }
      }
    };

    initGoogleBtn();
    
    // Backup listener in case the script tag finishes loading after component mount
    window.addEventListener("load", initGoogleBtn);
    return () => window.removeEventListener("load", initGoogleBtn);
  }, [theme, isLogin]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#F8FAFC] dark:bg-[#09090B] overflow-hidden transition-colors duration-300">
      
      {/* 1. Ambient Lighting Blobs (Premium Radial Glow) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#B386FF]/8 dark:bg-[#B386FF]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#FDB851]/8 dark:bg-[#FDB851]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* 2. Top Bar Theme Switcher */}
      <div className="absolute top-6 right-6">
        <button
          onClick={handleThemeToggle}
          className="size-11 rounded-full bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
      </div>

      {/* 3. Main Glassmorphism Form Card */}
      <div className="w-full max-w-[440px] z-10 transition-all duration-300">
        
        {/* Logo and Brand */}
        <div className="flex flex-col items-center gap-1.5 mb-8 text-center">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white uppercase font-sans">
              Docket
            </span>
            <div className="size-2 bg-[#FF9E79] rounded-full animate-pulse" />
          </div>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest leading-none mt-1">
            Workspace for your thoughts, isolated in style
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-white dark:bg-[#0E0E10] border border-slate-200/50 dark:border-zinc-800/80 rounded-[2.2rem] p-6 sm:p-8 shadow-xl dark:shadow-2xl shadow-slate-100 dark:shadow-black/40">
          
          {/* Interactive Sliding Tabs */}
          <div className="relative p-1 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl flex items-center mb-6">
            <div 
              className="absolute top-1 bottom-1 left-1 rounded-xl bg-white dark:bg-zinc-800 shadow-sm transition-all duration-300 ease-out pointer-events-none"
              style={{
                width: "calc(50% - 4px)",
                transform: `translateX(${isLogin ? "0%" : "100%"})`
              }}
            />
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-wider text-center z-10 transition-colors duration-200 cursor-pointer ${
                isLogin ? "text-neutral-900 dark:text-white" : "text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-wider text-center z-10 transition-colors duration-200 cursor-pointer ${
                !isLogin ? "text-neutral-900 dark:text-white" : "text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300"
              }`}
            >
              Register
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
            
            {/* NAME FIELD (Register only) */}
            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider pl-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50/50 dark:bg-zinc-900/40 text-neutral-800 dark:text-zinc-200 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl py-3.5 pl-11 pr-5 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                  />
                </div>
              </div>
            )}

            {/* EMAIL FIELD */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider pl-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                <input
                  type="email"
                  required
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50/50 dark:bg-zinc-900/40 text-neutral-800 dark:text-zinc-200 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl py-3.5 pl-11 pr-5 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                />
              </div>
            </div>

            {/* PASSWORD FIELD */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider pl-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50/50 dark:bg-zinc-900/40 text-neutral-800 dark:text-zinc-200 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl py-3.5 pl-11 pr-12 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-extrabold text-sm uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <div className="size-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>{isLogin ? "Sign In" : "Register"}</span>
              )}
            </button>
          </form>

          {/* Social Separator */}
          <div className="flex items-center my-6 gap-3">
            <div className="flex-1 h-[1px] bg-slate-200/60 dark:bg-zinc-800" />
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Or Continue With</span>
            <div className="flex-1 h-[1px] bg-slate-200/60 dark:bg-zinc-800" />
          </div>

          {/* Real Google Sign-in Button Container */}
          <div className="flex justify-center w-full mt-2 min-h-[44px]" id="real-google-btn"></div>

        </div>
      </div>

    </div>
  );
};

export default AuthPage;
