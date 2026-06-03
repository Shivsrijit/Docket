import { useEffect, useState } from "react";
import { Hourglass, RefreshCw } from "lucide-react";

const RateLimitedUI = ({ onRetry }) => {
  const [secondsLeft, setSecondsLeft] = useState(15);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onRetry) onRetry();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onRetry]);

  const percentage = (secondsLeft / 15) * 100;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 max-w-md w-full rounded-[2.5rem] p-8 shadow-2xl border border-black/5 dark:border-white/5 text-center relative overflow-hidden">
        {/* Rendering decorative color accent stripes */}
        <div className="absolute top-0 inset-x-0 h-1.5 flex">
          <div className="flex-1 bg-[#FDB851]" />
          <div className="flex-1 bg-[#FF9E79]" />
          <div className="flex-1 bg-[#D4F48A]" />
          <div className="flex-1 bg-[#B386FF]" />
          <div className="flex-1 bg-[#00C6FF]" />
        </div>

        {/* Rendering glowing hourglass status indicator */}
        <div className="size-20 bg-neutral-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner mt-4">
          <Hourglass className="size-8 text-neutral-800 dark:text-zinc-200 animate-bounce" />
        </div>

        {/* Rendering rate limit status header */}
        <h3 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-zinc-100 mb-3">
          Too many requests!
        </h3>
        
        <p className="text-neutral-500 dark:text-zinc-400 text-sm leading-relaxed mb-6">
          You are thinking faster than our servers can process. Take a deep breath while we clear the channel. basically you are ratelimited.
        </p>

        {/* Rendering active countdown timer */}
        <div className="mb-6">
          <span className="text-4xl font-extrabold text-black dark:text-white tabular-nums">
            {secondsLeft}s
          </span>
          <span className="block text-xs font-semibold text-neutral-400 uppercase tracking-widest mt-1">
            Reconnecting shortly
          </span>
        </div>

        {/* Rendering sliding countdown progress indicator */}
        <div className="w-full bg-neutral-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mb-8">
          <div 
            className="h-full bg-black dark:bg-white transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Rendering retry trigger button */}
        <button
          onClick={onRetry}
          className="w-full bg-black dark:bg-white text-white dark:text-black py-4 px-6 rounded-2xl font-bold tracking-tight hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl cursor-pointer"
        >
          <RefreshCw className="size-4 animate-spin" />
          <span>Retry Connection</span>
        </button>
      </div>
    </div>
  );
};

export default RateLimitedUI;