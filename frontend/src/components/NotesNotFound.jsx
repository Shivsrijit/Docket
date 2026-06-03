import { Notebook } from "lucide-react";

const NotesNotFound = ({ onCreateClick }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 max-w-md mx-auto text-center animate-fadeIn select-none">
      <div className="size-20 bg-neutral-100 dark:bg-zinc-900/60 rounded-[1.6rem] flex items-center justify-center mb-6 border border-slate-200/50 dark:border-zinc-800/80 shadow-sm text-[#B386FF]">
        <Notebook className="size-8" strokeWidth={1.5} />
      </div>
      <h3 className="text-2xl font-black tracking-tight text-neutral-800 dark:text-zinc-100 mb-2">No notes here yet</h3>
      <p className="text-neutral-500 dark:text-zinc-400 text-sm leading-relaxed mb-8">
        Ready to organize your thoughts? Let's write down your first docket to kickstart your journey.
      </p>
      <button 
        onClick={onCreateClick}
        className="bg-black dark:bg-white text-white dark:text-black py-4 px-8 rounded-[1.2rem] font-bold tracking-tight hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-lg cursor-pointer"
      >
        Create Your First Note
      </button>
    </div>
  );
};

export default NotesNotFound;