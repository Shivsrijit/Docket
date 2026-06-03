import { useEffect, useState, useRef } from "react";
import api from "../lib/axios";
import toast from "react-hot-toast";
import { 
  Bell, 
  X, 
  Send, 
  Brain, 
  Heart, 
  Clock, 
  Sparkles, 
  GraduationCap, 
  Check, 
  Info,
  Smile,
  MessageSquare,
  Trash2
} from "lucide-react";

// Minimalist, monochromatic styling configuration (high contrast, ultra-premium)
const PERSONA_CONFIGS = {
  Therapist: {
    name: "Docket's Doctor",
    role: "Mindfulness & Calming Support",
    avatar: "DR",
    icon: Brain,
  },
  LifePartner: {
    name: "Docket's Companion",
    role: "Cozy & Personal Check-in",
    avatar: "CO",
    icon: Heart,
  },
  Secretary: {
    name: "Docket's Secretary",
    role: "Schedules & Reminders",
    avatar: "SE",
    icon: Clock,
  },
  Friend: {
    name: "Docket's Friend",
    role: "Conversations & Humor",
    avatar: "FR",
    icon: Smile,
  },
  Teacher: {
    name: "Docket's Teacher",
    role: "Study Goals & Heuristics",
    avatar: "TE",
    icon: GraduationCap,
  },
};

const NotificationHub = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [replyInputs, setReplyInputs] = useState({});
  const [typingPersonas, setTypingPersonas] = useState({});
  const [submittingReply, setSubmittingReply] = useState({});
  const [activeFilter, setActiveFilter] = useState("All");
  const [permissionState, setPermissionState] = useState(
    !("Notification" in window) ? "unsupported" : Notification.permission
  );

  const drawerRef = useRef(null);

  const requestDesktopNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Desktop notifications are not supported in this browser.");
      return;
    }

    if (Notification.permission === "denied") {
      toast.error(
        "Notifications are blocked. Please click the site settings icon in your browser address bar to allow notifications.",
        { duration: 6000 }
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission === "granted") {
        toast.success("Desktop notifications enabled!");
        new Notification("Docket", {
          body: "System notifications are now active on this device.",
          icon: "/favicon.svg",
        });
      } else if (permission === "denied") {
        toast.error("Notification permission denied.");
      }
    } catch (err) {
      console.error("Error requesting notification permission:", err);
    }
  };


  // Fetch due notifications (delivers native OS push alerts)
  const fetchDueNotifications = async () => {
    try {
      const res = await api.get("/notifications/due");
      if (res.data && res.data.length > 0) {
        res.data.forEach((item) => {
          const config = PERSONA_CONFIGS[item.persona] || PERSONA_CONFIGS.Secretary;
          
          // Browser Push Notification (HTML5 Notification API)
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(config.name, {
                body: item.message,
                icon: "/favicon.svg",
              });
            } catch (e) {
              console.error("Failed to construct native push notification", e);
            }
          }
          
          // Toast Popup Alert
          toast.custom((t) => (
            <div className={`${t.visible ? "animate-enter" : "animate-leave"} max-w-md w-full bg-white dark:bg-[#121214] shadow-2xl rounded-2xl pointer-events-auto flex border border-slate-200/50 dark:border-zinc-800`}>
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="size-9 rounded-full flex items-center justify-center font-black text-[10px] tracking-wider bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-700">
                      {config.avatar}
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-xs font-black text-neutral-800 dark:text-zinc-200">
                      {config.name}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-400 font-semibold line-clamp-2">
                      {item.message}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-slate-200/50 dark:border-zinc-800/80">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    handleOpenDrawer();
                  }}
                  className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-xs font-black text-black dark:text-white hover:opacity-85 focus:outline-none cursor-pointer"
                >
                  Reply
                </button>
              </div>
            </div>
          ), { duration: 6000 });
        });
        fetchHistory();
      }
    } catch (err) {
      console.error("Error checking due notifications:", err.message);
    }
  };

  // 1. Initial Load, Event Syncing, & Lightweight Poller (30s) for Device Notifications
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((res) => {
        setPermissionState(res);
      }).catch(() => {});
    }
    fetchHistory();

    const pollInterval = setInterval(() => {
      fetchDueNotifications();
    }, 30000);

    const handleRefresh = () => {
      fetchHistory();
    };
    window.addEventListener("docket-refresh-notifications", handleRefresh);
    
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("docket-refresh-notifications", handleRefresh);
    };
  }, []);

  // Click outside to close drawer
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isOpen && drawerRef.current && !drawerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Fetch recent notifications history (GET /api/notifications)
  const fetchHistory = async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to load notifications history:", err.message);
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.delete("/notifications/clear");
      toast.success("Notification history cleared");
      fetchHistory();
    } catch (err) {
      console.error("Failed clearing history:", err.message);
      toast.error("Failed to clear notification history");
    }
  };

  const handleOpenDrawer = async () => {
    setIsOpen(true);
    fetchHistory();
    
    // Auto-request permission on user gesture (click floating bell) if default
    if ("Notification" in window && Notification.permission === "default") {
      try {
        const res = await Notification.requestPermission();
        setPermissionState(res);
        if (res === "granted") {
          new Notification("Docket", {
            body: "System notifications are now active on this device.",
            icon: "/favicon.svg",
          });
        }
      } catch (err) {
        console.error("Failed auto-requesting notification permission:", err);
      }
    }

    // Mark read immediately in DB so badge clears
    try {
      await api.post("/notifications/read");
    } catch (err) {
      console.error("Failed marking notifications read:", err.message);
    }
  };

  const handleCloseDrawer = () => {
    setIsOpen(false);
  };

  // Submit custom reply / quick-reply input
  const handleReplySubmit = async (id, text, persona) => {
    if (!text || !text.trim()) return;
    const responseText = text.trim();

    setSubmittingReply((prev) => ({ ...prev, [id]: true }));

    // Optimistically update status to 'replied' in state list
    setNotifications((prev) =>
      prev.map((item) =>
        item._id === id
          ? { ...item, status: "replied", userResponse: responseText }
          : item
      )
    );

    // Clear textbox
    setReplyInputs((prev) => ({ ...prev, [id]: "" }));

    try {
      await api.post(`/notifications/${id}/reply`, { response: responseText });
      
      // Satisfying dialogue micro-animation: trigger 'typing' loader for this persona
      setTypingPersonas((prev) => ({ ...prev, [persona]: true }));
      
      // Eager fetch after 3 seconds: AI follow-up was created as status: 'sent' directly!
      setTimeout(async () => {
        setTypingPersonas((prev) => ({ ...prev, [persona]: false }));
        await fetchHistory();
      }, 3000);

    } catch (err) {
      console.error("Failed submitting reply:", err.message);
      toast.error("Failed to submit response");
      fetchHistory(); // Rollback
    } finally {
      setSubmittingReply((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Format creation / trigger times into friendly stamp durations
  const getFriendlyTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Active / unreplied notifications count
  const unreadCount = notifications.filter((n) => n.status === "sent").length;

  // Filtered notifications stack
  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === "All") return true;
    return item.persona === activeFilter;
  });

  return (
    <>
      {/* 1. Floating Monochromatic Widget */}
      <button
        onClick={handleOpenDrawer}
        className="fixed bottom-6 right-6 lg:right-[306px] size-14 bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#18181B] dark:hover:bg-[#27272A] hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center z-40 transition-all shadow-xl hover:shadow-2xl cursor-pointer border border-white/10"
        title="Docket Assistant Hub"
      >
        <Bell className={`size-6 ${unreadCount > 0 ? "animate-swing" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 size-5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black flex items-center justify-center animate-bounce border-2 border-slate-900 shadow-md rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* 2. Chat-Style Monochromatic Sliding Drawer */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 pointer-events-none ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0"
        }`}
      >
        {/* Glass Backdrop */}
        <div className="absolute inset-0 drawer-backdrop" onClick={handleCloseDrawer} />

        {/* Drawer Panel */}
        <aside
          ref={drawerRef}
          className={`absolute top-0 right-0 h-full w-[360px] sm:w-[450px] bg-white dark:bg-[#09090B] border-l border-slate-100 dark:border-zinc-900 shadow-2xl flex flex-col transition-transform duration-300 ease-out z-10 ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200/50 dark:border-zinc-800/60 bg-white dark:bg-[#0C0C0E] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center select-none">
                <h2 className="text-sm font-black tracking-widest text-neutral-900 dark:text-white uppercase font-sans">
                  Docket Assistant
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {notifications.some(n => n.status === "sent" || n.status === "replied") && (
                  <button
                    onClick={handleClearHistory}
                    className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-neutral-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-all cursor-pointer border border-slate-200/40 dark:border-zinc-800/80"
                  >
                    Clear History
                  </button>
                )}
                <button
                  onClick={handleCloseDrawer}
                  className="size-8 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-850 flex items-center justify-center text-slate-500 hover:text-slate-950 dark:hover:text-zinc-100 transition-all cursor-pointer border border-slate-200/40 dark:border-zinc-800/80"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Persona Filtering Tabs (Monochromatic Linear Style) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x pt-2">
              {["All", "Therapist", "LifePartner", "Secretary", "Friend", "Teacher"].map((tabName) => {
                const isSelected = activeFilter === tabName;
                const personaConfig = PERSONA_CONFIGS[tabName];
                
                let displayName = tabName;
                if (tabName === "Therapist") displayName = "Doctor";
                else if (tabName === "LifePartner") displayName = "Companion";

                return (
                  <button
                    key={tabName}
                    onClick={() => setActiveFilter(tabName)}
                    className={`snap-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-black text-white dark:bg-white dark:text-black border-transparent shadow-xs"
                        : "bg-slate-50 dark:bg-[#121214] text-neutral-400 hover:text-neutral-800 dark:hover:text-zinc-200 border-slate-200/40 dark:border-zinc-800/60"
                    }`}
                  >
                    {personaConfig && (
                      <personaConfig.icon className="size-3" />
                    )}
                    <span>{displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeline Feed Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 relative bg-slate-50/40 dark:bg-zinc-950/20">
            
            {filteredNotifications.length === 0 ? (
              <div className="py-24 text-center select-none flex flex-col items-center justify-center px-6 max-w-sm mx-auto">
                <div className="size-14 rounded-2xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-neutral-500 mb-5 border border-slate-200/50 dark:border-zinc-800">
                  <MessageSquare className="size-5" />
                </div>
                <h3 className="text-xs font-black tracking-wide uppercase text-neutral-700 dark:text-zinc-300">
                  Channel Clean
                </h3>
                <p className="text-[11px] text-neutral-400 mt-2.5 leading-relaxed font-medium">
                  {activeFilter === "All"
                    ? "Draft schedules or moods in notes to trigger personalized, intelligent AI check-in threads."
                    : `No conversation threads have been logged under your ${activeFilter === "Therapist" ? "Doctor" : activeFilter === "LifePartner" ? "Companion" : activeFilter} channel yet.`}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const config = PERSONA_CONFIGS[item.persona] || PERSONA_CONFIGS.Secretary;
                const IconComponent = config.icon;
                const isItemTyping = typingPersonas[item.persona] && item.status === "replied";

                return (
                  <div
                    key={item._id}
                    className="flex gap-3.5 items-start select-text animate-fadeIn"
                  >
                    {/* Left Column: Monochromatic Avatar bubble */}
                    <div className="relative shrink-0 select-none">
                      <div className="size-9 rounded-full flex items-center justify-center font-black text-[10px] tracking-wider bg-slate-150 dark:bg-[#18181B] text-slate-700 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-800">
                        {config.avatar}
                      </div>
                      <div className="absolute -bottom-1 -right-1 size-4 bg-white dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800 rounded-full flex items-center justify-center text-neutral-400 dark:text-zinc-500 shadow-xs">
                        <IconComponent className="size-2.5" />
                      </div>
                    </div>

                    {/* Right Column: Bubble Thread Group */}
                    <div className="flex-1 space-y-2.5">
                      {/* Sub-Header: Persona & Time */}
                      <div className="flex items-center justify-between select-none">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-neutral-800 dark:text-zinc-200 leading-none">
                            {config.name}
                          </span>
                          <span className="text-[8px] font-bold text-neutral-400 dark:text-zinc-500 mt-1 block uppercase tracking-wider">
                            {config.role}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-neutral-400 dark:text-zinc-500">
                          {getFriendlyTime(item.updatedAt || item.createdAt)}
                        </span>
                      </div>

                      {/* Assistant Speech Bubble */}
                      <div className="bg-slate-100/90 dark:bg-[#18181B] p-4 rounded-2xl rounded-tl-xs text-xs font-semibold leading-relaxed text-neutral-800 dark:text-zinc-200 shadow-2xs border border-transparent dark:border-zinc-900/50">
                        {item.message}
                      </div>

                      {/* Quick Replies Options Stack */}
                      {item.status === "sent" && item.quickReplies && item.quickReplies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5 select-none">
                          {item.quickReplies.map((replyOption, index) => (
                            <button
                              key={index}
                              onClick={() => handleReplySubmit(item._id, replyOption, item.persona)}
                              disabled={submittingReply[item._id]}
                              className="py-1.5 px-3.5 rounded-xl text-[10px] font-bold border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#09090B] hover:border-black dark:hover:border-white text-[#52525B] dark:text-zinc-400 hover:text-black dark:hover:text-white disabled:opacity-50 transition-all cursor-pointer shadow-3xs"
                            >
                              {replyOption}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Inline Input Field */}
                      {item.status === "sent" && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleReplySubmit(item._id, replyInputs[item._id], item.persona);
                          }}
                          className="relative flex items-center bg-slate-100 dark:bg-zinc-900 border border-slate-200/40 dark:border-zinc-800/60 rounded-full pl-4 pr-10 py-1.5 focus-within:ring-1 focus-within:ring-black dark:focus-within:ring-white transition-all"
                        >
                          <input
                            type="text"
                            placeholder={`Reply to ${config.name}...`}
                            value={replyInputs[item._id] || ""}
                            onChange={(e) =>
                              setReplyInputs((prev) => ({ ...prev, [item._id]: e.target.value }))
                            }
                            disabled={submittingReply[item._id]}
                            className="w-full bg-transparent text-xs placeholder-neutral-400/80 dark:placeholder-zinc-500 focus:outline-none text-neutral-800 dark:text-zinc-200 pr-2 pl-0 py-0.5 border-0 focus:ring-0"
                          />
                          <button
                            type="submit"
                            disabled={!replyInputs[item._id]?.trim() || submittingReply[item._id]}
                            className="absolute right-1.5 size-7 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center disabled:opacity-20 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm border border-transparent dark:border-zinc-800/40"
                          >
                            <Send className="size-3" />
                          </button>
                        </form>
                      )}

                      {/* User Right-Aligned Bubble (If replied) */}
                      {item.status === "replied" && item.userResponse && (
                        <div className="flex justify-end pt-0.5 animate-slideUp">
                          <div className="max-w-[85%] bg-black dark:bg-white text-white dark:text-black rounded-2xl rounded-tr-xs py-3.5 px-4 text-xs font-semibold shadow-xs relative border border-transparent dark:border-zinc-800">
                            <span className="block text-[8px] font-black text-white/50 dark:text-black/50 uppercase tracking-widest leading-none mb-1">
                              Your Reply
                            </span>
                            {item.userResponse}
                            <div className="flex items-center justify-end gap-1 mt-1 text-[8px] font-bold text-white/70 dark:text-black/70 select-none">
                              <Check className="size-2.5" strokeWidth={3} />
                              <span>Replied</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bouncing Dot Typings */}
                      {isItemTyping && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 dark:text-zinc-500 pt-1 select-none animate-fadeIn">
                          <div className="flex gap-1 bg-slate-100/90 dark:bg-[#18181B] p-2.5 rounded-2xl rounded-tl-xs">
                            <div className="size-1.5 bg-neutral-450 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="size-1.5 bg-neutral-450 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="size-1.5 bg-neutral-450 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span className="italic">{config.name} is writing a response...</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes swing {
          0% { transform: rotate(0); }
          15% { transform: rotate(15deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(8deg); }
          60% { transform: rotate(-5deg); }
          75% { transform: rotate(3deg); }
          100% { transform: rotate(0); }
        }
        .animate-swing {
          animation: swing 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
          transform-origin: top center;
        }
        @keyframes slideUp {
          from { transform: translateY(4px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideUp {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </>
  );
};

export default NotificationHub;
