import { Pencil, Star, Folder } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate, stripHtml } from "../lib/utils";
import toast from "react-hot-toast";
import api from "../lib/axios";

const NoteCard = ({ note, setNotes, onEditClick }) => {
  const handleTogglePin = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await api.put(`/notes/${note._id}`, {
        ...note,
        isPinned: !note.isPinned,
      });
      
      // Update notes local state
      setNotes((prev) => 
        prev.map((n) => (n._id === note._id ? res.data : n))
      );
      
      toast.success(note.isPinned ? "Note unpinned" : "Pinned note to the top");
    } catch (error) {
      console.error("Error toggling pin state", error);
      toast.error("Failed to pin note");
    }
  };

  // Helper to ensure text remains highly readable with rich contrast
  const textColorClass = "text-neutral-900";
  const descColorClass = "text-neutral-800/70";
  const dateColorClass = "text-neutral-800/60";

  return (
    <div
      draggable="true"
      onDragStart={(e) => {
        e.dataTransfer.setData("noteId", note._id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onEditClick(note._id)}
      className="note-card-premium group relative rounded-[2rem] p-7 flex flex-col justify-between h-[230px] cursor-grab active:cursor-grabbing select-none"
      style={{ backgroundColor: note.color || "#FDB851" }}
    >
      {/* Top Section */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start gap-4">
          <h3 className={`font-bold text-lg md:text-xl tracking-tight leading-snug line-clamp-2 ${textColorClass}`}>
            {note.title}
          </h3>
          
          {/* Star Pin Button */}
          <button
            onClick={handleTogglePin}
            className={`size-8 rounded-full flex items-center justify-center transition-all duration-300 ease-out hover:scale-110 active:scale-95 z-10 ${
              note.isPinned 
                ? "bg-black text-amber-400" 
                : "bg-black/10 text-black/40 hover:bg-black hover:text-white opacity-0 group-hover:opacity-100"
            }`}
            title={note.isPinned ? "Unpin Note" : "Pin Note"}
          >
            <Star 
              className="size-4" 
              fill={note.isPinned ? "currentColor" : "none"} 
            />
          </button>
        </div>
        
        {/* Content Preview */}
        <p className={`text-sm leading-relaxed line-clamp-3 ${descColorClass}`}>
          {stripHtml(note.content)}
        </p>
      </div>

      {/* Bottom Section */}
      <div className="flex justify-between items-center mt-4">
        {/* Date & Category */}
        <div className="flex flex-col gap-1.5 items-start">
          <span className={`text-[10px] font-bold tracking-wider uppercase ${dateColorClass}`}>
            {formatDate(new Date(note.createdAt))}
          </span>
          {note.folder && (
            <span className="text-[9px] font-black uppercase tracking-widest bg-black/10 text-neutral-900 rounded-full px-2 py-0.5 w-fit flex items-center gap-1 select-none">
              <Folder className="size-2.5" />
              <span>{note.folder}</span>
            </span>
          )}
        </div>
        
        {/* Pencil Edit Icon in Black Circle */}
        <div className="size-9 bg-black text-white rounded-full flex items-center justify-center transition-all duration-300 ease-out group-hover:rotate-12 group-hover:scale-105 shadow-md">
          <Pencil className="size-3.5" />
        </div>
      </div>
    </div>
  );
};

export default NoteCard;