import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../lib/axios";
import toast from "react-hot-toast";
import NoteCard from "../components/NoteCard";
import FolderCard from "../components/FolderCard";
import NotesNotFound from "../components/NotesNotFound";
import RateLimitedUI from "../components/RateLimitedUI";
import CreatePage from "./CreatePage";
import NoteDetailPage from "./NoteDetailPage";
import NotificationHub from "../components/NotificationHub";
import { Plus, Search, Sun, Moon, Inbox, FolderPlus, X, ChevronRight, FolderClosed, Grid, List, Menu, Folder, Trash2, LogOut } from "lucide-react";

const HomePage = ({ user, setUser, theme, setTheme }) => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Category selected filter ("" means showing ALL notes mixed by default!)
  const [selectedFolder, setSelectedFolder] = useState("");
  
  // Right sidebar folders layout preference: "list", "grid", "compact"
  const [foldersLayout, setFoldersLayout] = useState(() => {
    return localStorage.getItem("docket-folders-layout") || "list";
  });

  // Custom folder creation modal state
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#B386FF");

  const navigate = useNavigate();
  const location = useLocation();

  // Check URL paths to see if we should trigger drawers/canvases
  const isCreateOpen = location.pathname === "/create";
  const editMatch = location.pathname.match(/\/note\/([a-fA-F0-9]+)/);
  const editingId = editMatch ? editMatch[1] : null;

  useEffect(() => {
    localStorage.setItem("docket-folders-layout", foldersLayout);
  }, [foldersLayout]);

  const fetchNotesAndFolders = async () => {
    try {
      const [notesRes, foldersRes] = await Promise.all([
        api.get("/notes"),
        api.get("/folders")
      ]);
      setNotes(notesRes.data);
      setFolders(foldersRes.data);
      setIsRateLimited(false);
    } catch (error) {
      console.error("Error fetching workspace data", error);
      if (error.response?.status === 429) {
        setIsRateLimited(true);
      } else {
        toast.error("Failed to load workspace data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotesAndFolders();
  }, []);

  const handleDrawerClose = () => {
    navigate("/");
    fetchNotesAndFolders(); // refresh changes
  };

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    localStorage.removeItem("docket-token");
    setUser(null);
    toast.success("Logged out successfully");
    navigate("/");
  };

  // Drag and Drop Note into Folder
  const handleDropNote = async (noteId, folderName) => {
    const noteToUpdate = notes.find((n) => n._id === noteId);
    if (!noteToUpdate) return;

    try {
      const res = await api.put(`/notes/${noteId}`, {
        ...noteToUpdate,
        folder: folderName,
      });

      // Update local state notes list
      setNotes((prev) => 
        prev.map((n) => (n._id === noteId ? res.data : n))
      );

      if (folderName === "") {
        toast.success("Note removed from folder");
      } else {
        toast.success(`Note cataloged inside "${folderName}" folder`);
      }
    } catch (error) {
      console.error("Error moving note", error);
      toast.error("Failed to categorize note");
    }
  };

  // Folder creation handler
  const handleCreateFolderSubmit = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      toast.error("Please provide a category name");
      return;
    }

    try {
      const res = await api.post("/folders", {
        name: newFolderName.trim(),
        color: newFolderColor,
      });
      setFolders((prev) => [...prev, res.data]);
      toast.success(`Category "${newFolderName}" established!`);
      setIsCreateFolderOpen(false);
      setNewFolderName("");
      setNewFolderColor("#B386FF");
    } catch (error) {
      console.error("Error establishing category", error);
      toast.error(error.response?.data?.message || "Failed to create category");
    }
  };

  // Active folder deletion handler
  const handleDeleteActiveFolder = async () => {
    const folderObj = folders.find((f) => f.name === selectedFolder);
    if (!folderObj) return;

    if (!window.confirm(`Are you sure you want to delete the folder "${folderObj.name}"? Notes inside will return to Workspace.`)) {
      return;
    }

    try {
      await api.delete(`/folders/${folderObj._id}`);
      toast.success("Category deleted successfully");
      setSelectedFolder(""); // reset view to workspace
      fetchNotesAndFolders(); // refresh lists and counts
    } catch (error) {
      console.error("Error deleting folder", error);
      toast.error("Failed to delete category");
    }
  };

  // Calculate note counts per folder
  const getNoteCountForFolder = (folderName) => {
    return notes.filter((n) => n.folder === folderName).length;
  };

  // Drag over states for the general Inbox dropzone on right sidebar
  const [isInboxDragOver, setIsInboxDragOver] = useState(false);

  // Sorting and filtering note lists
  const getSortedFilteredNotes = (notesList) => {
    const pinned = notesList.filter((n) => n.isPinned);
    const regular = notesList.filter((n) => !n.isPinned);
    const sorted = [...pinned, ...regular];
    
    // Filter by search query
    const query = searchQuery.toLowerCase().trim();
    if (!query) return sorted;
    return sorted.filter(
      (note) =>
        note.title?.toLowerCase().includes(query) ||
        note.content?.toLowerCase().includes(query)
    );
  };

  // Dynamic Notes Display:
  // - If a folder is selected: display note cards belonging ONLY to that folder.
  // - Else (no active filter): display ALL Note cards (loose + folder categorised) by default!
  const displayedNotes = getSortedFilteredNotes(
    selectedFolder !== ""
      ? notes.filter((n) => n.folder === selectedFolder)
      : notes
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] text-neutral-800 dark:text-zinc-100 transition-colors duration-300">
      
      {/* 1. Left Sidebar (Fixed, 100px) */}
      <aside className="hidden md:flex flex-col w-[100px] h-screen fixed left-0 top-0 border-r border-slate-100 dark:border-zinc-900 bg-white dark:bg-[#0C0C0E] items-center justify-between py-10 z-20 shadow-sm">
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-black tracking-tight text-neutral-900 dark:text-white uppercase leading-none font-sans">
            Docket
          </span>
          <div className="size-1.5 bg-[#FF9E79] rounded-full mt-0.5" />
        </div>

        <button
          onClick={() => navigate("/create")}
          className="size-14 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center hover:scale-110 hover:-rotate-90 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer"
          title="Create New Note"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </button>

        <div className="flex flex-col items-center gap-6 w-full">
          <button
            onClick={handleThemeToggle}
            className="size-10 rounded-full bg-slate-50 dark:bg-zinc-900 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-slate-100 dark:border-zinc-800"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
          </button>

          {/* User profile and Log out */}
          <div className="flex flex-col items-center gap-3 border-t border-slate-100 dark:border-zinc-900/60 pt-5 w-full px-2">
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="size-9 rounded-full object-cover border border-slate-200 dark:border-zinc-800"
                title={`${user.name} (${user.email})`}
              />
            ) : (
              <div 
                className="size-9 rounded-full bg-[#B386FF]/20 flex items-center justify-center text-xs font-black text-[#B386FF] border border-[#B386FF]/10 uppercase"
                title={`${user.name} (${user.email})`}
              >
                {user?.name?.charAt(0) || "U"}
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="size-9 rounded-full bg-red-50 dark:bg-red-950/20 text-red-500 hover:text-red-700 dark:hover:text-red-400 flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Log Out"
            >
              <LogOut className="size-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Responsive Top Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-zinc-900 bg-white dark:bg-[#0C0C0E] sticky top-0 w-full z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black tracking-tight text-neutral-900 dark:text-white uppercase font-sans">
            Docket
          </span>
          <div className="size-1.5 bg-[#FF9E79] rounded-full" />
        </div>
        
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleThemeToggle}
            className="size-9 rounded-full bg-slate-50 dark:bg-zinc-900 flex items-center justify-center text-slate-500 dark:text-zinc-400 border border-slate-100 dark:border-zinc-800 cursor-pointer"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          
          <button
            onClick={() => navigate("/create")}
            className="size-9 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
            title="Create New Note"
          >
            <Plus className="size-4.5" strokeWidth={2.5} />
          </button>

          <button
            onClick={handleLogout}
            className="size-9 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* 3. Center Workspace Area (Independent Scrollable Area) */}
      <main className="flex-1 md:ml-[100px] lg:mr-[280px] p-4 sm:p-8 md:p-10 flex flex-col gap-6 md:gap-8 min-h-screen">
        
        {/* Dynamic Search */}
        <section className="flex flex-col gap-6 border-b border-slate-100 dark:border-zinc-900/60 pb-6 w-full">
          
          {/* Top Search with expanded left icon padding */}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 size-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900/40 text-neutral-800 dark:text-zinc-200 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl py-3 pl-16 pr-5 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all shadow-sm"
            />
          </div>
        </section>

        {/* 3.1 Mobile & Tablet Category horizontal scroll slider (Sticky top on mobile/tablet) */}
        <div className="lg:hidden sticky top-[73px] md:top-0 z-30 bg-[#F8FAFC] dark:bg-[#09090B] -mx-4 px-4 sm:-mx-8 sm:px-8 pt-4 pb-2 border-b border-slate-100 dark:border-zinc-900/60 transition-colors duration-300">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Categories</span>
              <button
                onClick={() => setIsCreateFolderOpen(true)}
                className="h-7 px-3 bg-neutral-100 dark:bg-zinc-900 hover:bg-neutral-200 dark:hover:bg-zinc-800 text-neutral-700 dark:text-zinc-300 rounded-full font-bold text-[10px] flex items-center gap-1 border border-neutral-200/20"
              >
                <FolderPlus className="size-3" />
                <span>New</span>
              </button>
            </div>
            
            <div className="pt-2 flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x">
              {/* All Notes Pocket Card */}
              <div
                onClick={() => setSelectedFolder("")}
                data-folder-name=""
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsInboxDragOver(true);
                }}
                onDragLeave={() => setIsInboxDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsInboxDragOver(false);
                  const noteId = e.dataTransfer.getData("noteId");
                  if (noteId) handleDropNote(noteId, "");
                }}
                className={`relative snap-center flex-shrink-0 w-[145px] h-[120px] cursor-pointer transition-all duration-300 ease-out select-none flex flex-col justify-end ${
                  selectedFolder === "" ? "scale-[1.03] -translate-y-1 shadow-lg" : ""
                }`}
              >
                {/* Folder Top Tab */}
                <div className="absolute top-1.5 left-0 h-6 w-20 rounded-t-xl bg-slate-900 dark:bg-zinc-800 transition-colors duration-300" />
                
                {/* Papers Sticking Out */}
                <div className="absolute inset-x-4 top-0 h-8 flex justify-center items-end gap-1 z-0 pointer-events-none overflow-hidden">
                  <div className="w-8 h-9 bg-white/70 dark:bg-zinc-200/50 rounded-md rotate-[-8deg] translate-y-3 shadow-sm border border-black/5" />
                  <div className="w-9 h-10 bg-white/95 dark:bg-white/85 rounded-md translate-y-2 shadow-md border border-black/5" />
                  <div className="w-8 h-9 bg-white/80 dark:bg-zinc-200/60 rounded-md rotate-[8deg] translate-y-3 shadow-sm border border-black/5" />
                </div>

                {/* Main Folder Body */}
                <div className="w-full h-[90px] rounded-r-[1.5rem] rounded-bl-[1.5rem] rounded-tl-none p-4 flex flex-col justify-between z-10 transition-all duration-300 shadow-md border border-black/5 dark:border-white/5 bg-slate-900 dark:bg-zinc-800 text-white">
                  <div className="flex justify-between items-start w-full">
                    <span className="text-sm font-black tracking-tight flex items-center gap-1.5">
                      <Folder className="size-4 text-white/80" />
                      <span>All Notes</span>
                    </span>
                    {selectedFolder === "" && (
                      <div className="size-2 rounded-full bg-white/80 animate-pulse mt-1 flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="text-lg font-black tabular-nums text-white">
                      {notes.length}
                    </span>
                    <span className="text-[8px] font-extrabold text-white/60 uppercase tracking-widest mt-0.5">
                      {notes.length === 1 ? "Docket" : "Dockets"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Folders List */}
              {folders.map((folder) => (
                <div key={folder._id} className="snap-center flex-shrink-0 w-[145px]">
                  <FolderCard
                    folder={folder}
                    noteCount={getNoteCountForFolder(folder.name)}
                    onDropNote={handleDropNote}
                    onClickFolder={(name) => setSelectedFolder(name)}
                    isActive={selectedFolder === folder.name}
                    layout="list"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Workspace Center Content displaying ONLY notes cards */}
        <section className="flex-1 flex flex-col gap-6">
          
          {/* Header Display */}
          <div className="flex items-center justify-between">
            {selectedFolder !== "" ? (
              <div className="flex items-center gap-2 select-none">
                <button
                  onClick={() => setSelectedFolder("")}
                  className="text-xs font-bold text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Workspace
                </button>
                <ChevronRight className="size-3.5 text-neutral-300" />
                <span className="text-xl md:text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2 animate-fadeIn">
                  <Folder className="size-5.5 text-neutral-900 dark:text-white" />
                  <span>{selectedFolder}</span>
                </span>
                <button
                  onClick={() => setSelectedFolder("")}
                  className="size-7 rounded-full bg-slate-100 dark:bg-zinc-850 flex items-center justify-center hover:scale-105 active:scale-95 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  title="Show All Notes"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-neutral-900 dark:text-white truncate max-w-[320px] md:max-w-md">
                {user?.name ? `${user.name}'s Notes` : "Notes"}
              </h1>
            )}
            
            {/* Notes count & Delete active folder action */}
            {!loading && (
              <div className="flex items-center gap-3">
                {selectedFolder !== "" && (
                  <button
                    onClick={handleDeleteActiveFolder}
                    className="h-8 px-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-red-100 dark:border-red-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                    title="Delete this folder"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="hidden sm:inline">Delete Folder</span>
                  </button>
                )}
                <span className="text-xs font-bold bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-zinc-400 py-1.5 px-3.5 rounded-full select-none">
                  {displayedNotes.length} {displayedNotes.length === 1 ? "Note" : "Notes"}
                </span>
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="size-8 border-3 border-neutral-950 dark:border-white rounded-full premium-spinner" />
              <span className="text-xs font-bold text-neutral-400 tracking-widest uppercase mt-2">
                Loading...
              </span>
            </div>
          )}

          {/* Empty notes */}
          {!loading && notes.length === 0 && !isRateLimited && (
            <NotesNotFound onCreateClick={() => navigate("/create")} />
          )}

          {/* Notes Grid Render */}
          {!loading && notes.length > 0 && !isRateLimited && (
            <>
              {displayedNotes.length === 0 ? (
                <div className="py-20 text-center select-none border border-dashed border-slate-200/80 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-950/20 flex flex-col items-center justify-center">
                  <Folder className="size-10 text-neutral-400 dark:text-zinc-650 mb-3" />
                  <h3 className="text-lg font-bold text-neutral-700 dark:text-zinc-300">No notes inside here</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    {selectedFolder !== "" 
                      ? "Drag cards from workspace onto this folder category to file them" 
                      : "Create your first thought to begin listing"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 animate-fadeIn">
                  {displayedNotes.map((note) => (
                    <NoteCard
                      key={note._id}
                      note={note}
                      setNotes={setNotes}
                      onEditClick={(id) => navigate(`/note/${id}`)}
                      onDropNote={handleDropNote}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* 4. Right Categories Sidebar (Fixed on Desktop, 280px) */}
      <aside className="hidden lg:flex flex-col w-[280px] h-screen fixed right-0 top-0 border-l border-slate-100 dark:border-zinc-900 bg-white/40 dark:bg-[#0C0C0E]/40 backdrop-blur-md p-6 overflow-y-auto z-20 shadow-sm gap-6 transition-colors duration-300">
        
        {/* Header Block with custom organization selectors */}
        <div className="flex flex-col gap-4 border-b border-slate-100 dark:border-zinc-900/60 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderClosed className="size-5 text-neutral-500" />
              <h2 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white uppercase font-sans">
                Groups
              </h2>
            </div>
            
            <button
              onClick={() => setIsCreateFolderOpen(true)}
              className="size-9 bg-black/5 hover:bg-black/10 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-neutral-700 dark:text-zinc-300 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all border border-slate-200/30 dark:border-zinc-850 cursor-pointer"
              title="Create New Folder Category"
            >
              <FolderPlus className="size-4.5" />
            </button>
          </div>

          {/* Organizing Layout controllers (Grid vs List vs Compact stack) */}
          <div className="flex items-center gap-1.5 bg-neutral-100/60 dark:bg-zinc-900/60 p-1 rounded-xl w-fit self-end border border-slate-200/20">
            <button
              onClick={() => setFoldersLayout("list")}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                foldersLayout === "list"
                  ? "bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-350"
              }`}
              title="Single Column Stack"
            >
              <List className="size-3.5" />
            </button>
            
            <button
              onClick={() => setFoldersLayout("grid")}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                foldersLayout === "grid"
                  ? "bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-350"
              }`}
              title="2-Column Grid"
            >
              <Grid className="size-3.5" />
            </button>
            
            <button
              onClick={() => setFoldersLayout("compact")}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                foldersLayout === "compact"
                  ? "bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-350"
              }`}
              title="Compact Rows List"
            >
              <Menu className="size-3.5" />
            </button>
          </div>
        </div>

        {/* 4.1 Fixed All Notes drop zone at the top of category sidebar */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsInboxDragOver(true);
          }}
          onDragLeave={() => setIsInboxDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsInboxDragOver(false);
            const noteId = e.dataTransfer.getData("noteId");
            if (noteId) handleDropNote(noteId, "");
          }}
          onClick={() => setSelectedFolder("")}
          className={`relative h-[120px] cursor-pointer transition-all duration-300 ease-out select-none flex flex-col justify-end ${
            selectedFolder === "" ? "scale-[1.03] -translate-y-1 shadow-lg" : ""
          } ${isInboxDragOver ? "scale-[1.04] -translate-y-1.5" : "hover:scale-[1.02] hover:-translate-y-0.5"}`}
        >
          {/* 1. Folder Top Tab */}
          <div className="absolute top-1.5 left-0 h-6 w-20 rounded-t-xl bg-slate-900 dark:bg-zinc-800 transition-colors duration-300" />
          
          {/* 2. Papers Sticking Out */}
          <div className="absolute inset-x-4 top-0 h-8 flex justify-center items-end gap-1 z-0 pointer-events-none overflow-hidden">
            <div className="w-8 h-9 bg-white/70 dark:bg-zinc-200/50 rounded-md rotate-[-8deg] translate-y-3 shadow-sm border border-black/5" />
            <div className="w-9 h-10 bg-white/95 dark:bg-white/85 rounded-md translate-y-2 shadow-md border border-black/5" />
            <div className="w-8 h-9 bg-white/80 dark:bg-zinc-200/60 rounded-md rotate-[8deg] translate-y-3 shadow-sm border border-black/5" />
          </div>

          {/* 3. Main Folder Body */}
          <div className="w-full h-[90px] rounded-r-[1.5rem] rounded-bl-[1.5rem] rounded-tl-none p-4 flex flex-col justify-between z-10 transition-all duration-300 shadow-md border border-black/5 dark:border-white/5 bg-slate-900 dark:bg-zinc-800 text-white">
            <div className="flex justify-between items-start w-full">
              <span className="text-sm font-black tracking-tight flex items-center gap-1.5">
                <Folder className="size-4 text-white/80" />
                <span>All Notes</span>
              </span>
              {selectedFolder === "" && (
                <div className="size-2 rounded-full bg-white/80 animate-pulse mt-1 flex-shrink-0" />
              )}
            </div>

            <div className="flex flex-col gap-0.5 leading-none">
              <span className="text-lg font-black tabular-nums text-white">
                {notes.length}
              </span>
              <span className="text-[8px] font-extrabold text-white/60 uppercase tracking-widest mt-0.5">
                {notes.length === 1 ? "Docket" : "Dockets"}
              </span>
            </div>
          </div>
        </div>

        {/* 4.2 Interactive Folder list stack with layout adaptabilities */}
        <div className="flex-1 flex flex-col gap-6">
          {folders.length === 0 ? (
            <div className="py-12 text-center select-none border border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl p-6 bg-slate-50/20 dark:bg-zinc-950/10 mt-2 flex flex-col items-center justify-center">
              <Folder className="size-8 text-neutral-400 dark:text-zinc-650 mb-2.5" />
              <h4 className="text-sm font-bold text-neutral-500">No folders here</h4>
              <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">
                Add a new category folder to drag your thoughts inside
              </p>
            </div>
          ) : (
            <div className={
              foldersLayout === "grid" 
                ? "grid grid-cols-2 gap-4 animate-fadeIn" 
                : "flex flex-col gap-5 animate-fadeIn"
            }>
              {folders.map((folder) => (
                <FolderCard
                  key={folder._id}
                  folder={folder}
                  noteCount={getNoteCountForFolder(folder.name)}
                  onDropNote={handleDropNote}
                  onClickFolder={(name) => setSelectedFolder(name)}
                  isActive={selectedFolder === folder.name}
                  layout={foldersLayout}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* 5. Category Folder Creation Centered Modal */}
      {isCreateFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div 
            onClick={() => setIsCreateFolderOpen(false)}
            className="absolute inset-0 drawer-backdrop cursor-pointer"
          />
          <div className="bg-white dark:bg-zinc-950 border border-neutral-100 dark:border-zinc-850 p-8 max-w-sm w-full rounded-[2rem] shadow-2xl relative z-10">
            <h3 className="text-xl font-black tracking-tight mb-4">Create New Group</h3>
            <form onSubmit={handleCreateFolderSubmit} className="space-y-5">
              
              <div className="form-control">
                <label className="label">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Folder Title</span>
                </label>
                <input
                  type="text"
                  placeholder="Personal, Work, Ideas..."
                  className="w-full bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-sm font-semibold text-neutral-900 dark:text-white"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  maxLength={15}
                  autoFocus
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Folder Theme Color</span>
                </label>
                <div className="flex items-center gap-3 mt-1.5">
                  {[
                    "#B386FF", // Violet
                    "#FDB851", // Sand
                    "#FF9E79", // Peach
                    "#D4F48A", // Pistachio
                    "#00C6FF", // Sky Blue
                  ].map((colorCode) => (
                    <button
                      key={colorCode}
                      type="button"
                      onClick={() => setNewFolderColor(colorCode)}
                      className="size-8 rounded-full transition-all flex items-center justify-center cursor-pointer"
                      style={{
                        backgroundColor: colorCode,
                        boxShadow: newFolderColor === colorCode 
                          ? `0 0 0 2px var(--fallback-b1,oklch(var(--b1))), 0 0 0 4px #1A1A1A` 
                          : "0 2px 4px rgba(0,0,0,0.06)"
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateFolderOpen(false)}
                  className="flex-1 py-3 border border-neutral-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-neutral-500 hover:bg-neutral-50 dark:hover:bg-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md"
                >
                  Create
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 6. Center Focused Canvas - Create Note Overlay */}
      {isCreateOpen && (
        <CreatePage onClose={handleDrawerClose} />
      )}

      {/* 7. Center Focused Canvas - Edit Note Overlay */}
      {editingId && (
        <NoteDetailPage id={editingId} onClose={handleDrawerClose} onUpdated={fetchNotesAndFolders} />
      )}

      {/* 8. Upstash Rate Limiting Overlay */}
      {isRateLimited && (
        <RateLimitedUI onRetry={fetchNotesAndFolders} />
      )}

      {/* 9. AI Agentic Notification Hub Drawer & Widget */}
      <NotificationHub />
    </div>
  );
};

export default HomePage;