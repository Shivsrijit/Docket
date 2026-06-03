import { useState } from "react";

const FolderCard = ({ folder, noteCount, onDropNote, onClickFolder, isActive, layout = "list" }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const noteId = e.dataTransfer.getData("noteId");
    if (noteId && onDropNote) {
      onDropNote(noteId, folder.name);
    }
  };

  const folderColor = folder.color || "#B386FF";

  // RENDER COMPACT LIST STYLE ROW
  if (layout === "compact") {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => onClickFolder(folder.name)}
        data-folder-name={folder.name}
        className={`w-full p-4 rounded-[1.2rem] flex items-center justify-between cursor-pointer select-none transition-all duration-200 border ${
          isActive
            ? "bg-black dark:bg-white text-white dark:text-zinc-950 shadow-md border-transparent"
            : isDragOver
              ? "bg-neutral-100 dark:bg-zinc-900 border-2 border-dashed border-black dark:border-white scale-102"
              : "bg-slate-50 dark:bg-zinc-900/40 border-slate-200/30 dark:border-zinc-850 hover:scale-[1.02] text-neutral-800 dark:text-zinc-200"
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Color bubble */}
          <div 
            className="size-3.5 rounded-full border border-black/10 shadow-sm flex-shrink-0"
            style={{ backgroundColor: folderColor }}
          />
          <span className="text-sm font-extrabold tracking-tight leading-none truncate max-w-[140px]">
            {folder.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Note count bubble */}
          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full select-none ${
            isActive ? "bg-white/10 dark:bg-zinc-950 text-white dark:text-zinc-950" : "bg-neutral-100 dark:bg-zinc-800 text-neutral-500"
          }`}>
            {noteCount}
          </span>
        </div>
      </div>
    );
  }

  // RENDER ORIGINAL SPACIOUS POCKET STYLE CARD (Height 120px, pocket 90px)
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => onClickFolder(folder.name)}
      data-folder-name={folder.name}
      className={`relative h-[120px] cursor-pointer transition-all duration-300 ease-out select-none flex flex-col justify-end ${
        isDragOver ? "scale-[1.04] -translate-y-1.5" : "hover:scale-[1.02] hover:-translate-y-0.5"
      } ${isActive ? "scale-[1.03] -translate-y-1 shadow-lg" : ""}`}
    >
      {/* 1. Folder Top Tab (Spacious ear) */}
      <div 
        className="absolute top-1.5 left-0 h-6 w-20 rounded-t-xl transition-colors duration-300"
        style={{ backgroundColor: folderColor }}
      />
      
      {/* 2. Papers Sticking Out */}
      <div className="absolute inset-x-4 top-0 h-8 flex justify-center items-end gap-1 z-0 pointer-events-none overflow-hidden">
        <div className="w-8 h-9 bg-white/70 dark:bg-zinc-200/50 rounded-md rotate-[-8deg] translate-y-3 shadow-sm border border-black/5" />
        <div className="w-9 h-10 bg-white/95 dark:bg-white/85 rounded-md translate-y-2 shadow-md border border-black/5" />
        <div className="w-8 h-9 bg-white/80 dark:bg-zinc-200/60 rounded-md rotate-[8deg] translate-y-3 shadow-sm border border-black/5" />
      </div>

      {/* 3. Main Folder Body Container */}
      <div
        className={`w-full h-[90px] rounded-r-[1.5rem] rounded-bl-[1.5rem] rounded-tl-none p-4 flex flex-col justify-between z-10 transition-all duration-300 shadow-md ${
          isDragOver 
            ? "shadow-lg border-2 border-dashed border-black/30 brightness-105" 
            : "border border-black/5 dark:border-white/5"
        }`}
        style={{ backgroundColor: folderColor }}
      >
        <div className="flex justify-between items-start w-full">
          <span className="text-sm font-black text-neutral-950 tracking-tight line-clamp-1">
            {folder.name}
          </span>
          {isActive && (
            <div className="size-2 rounded-full bg-neutral-950/80 animate-pulse mt-1 flex-shrink-0" />
          )}
        </div>

        <div className="flex flex-col gap-0.5 leading-none">
          <span className="text-lg font-black text-neutral-950 tabular-nums">
            {noteCount}
          </span>
          <span className="text-[8px] font-extrabold text-neutral-950/60 uppercase tracking-widest mt-0.5">
            {noteCount === 1 ? "Docket" : "Dockets"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FolderCard;
