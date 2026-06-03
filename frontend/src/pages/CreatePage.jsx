import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios";
import { X, Save, FolderKanban, Star, Bold, Italic, Highlighter, List, ListTodo, Link2, Heading1, Heading2, Quote, Code, Eraser } from "lucide-react";
import ColorPaletteSelector from "../components/ColorPaletteSelector";

const CreatePage = ({ onClose }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("#FDB851"); // Default Sand
  const [isPinned, setIsPinned] = useState(false);
  const [folder, setFolder] = useState(""); // Folder assignment
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const editorRef = useRef(null);
  
  // Track active formatting styles at current cursor selection
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    highlight: false,
    bullet: false,
    checklist: false,
    link: false,
    h1: false,
    h2: false,
    blockquote: false,
    code: false,
  });

  const navigate = useNavigate();

  useEffect(() => {
    // Fetch available folders to assign categories
    const fetchFolders = async () => {
      try {
        const res = await api.get("/folders");
        setFolders(res.data);
      } catch (error) {
        console.error("Error fetching folders", error);
      }
    };
    fetchFolders();
  }, []);

  // Initialize contentEditable div to empty string on mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
  }, []);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate("/");
    }
  };

  const getHighlightColor = () => {
    const isDark = document.documentElement.classList.contains("dark") || 
                   document.documentElement.getAttribute("data-theme") === "dark" ||
                   document.body.classList.contains("dark");
    return isDark ? "#ca8a04" : "#fef08a"; // Soft gold/amber in dark, soft pastel yellow in light
  };

  const updateActiveStyles = () => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    let insideHighlight = false;
    let insideLink = false;
    let insideBullet = false;
    let insideChecklist = false;
    
    try {
      const bgVal = (document.queryCommandValue("backColor") || "").toLowerCase().replace(/\s+/g, "");
      const hiliteVal = (document.queryCommandValue("hiliteColor") || "").toLowerCase().replace(/\s+/g, "");
      if (
        bgVal.includes("254,240,138") || bgVal.includes("202,138,4") || bgVal.includes("fef08a") || bgVal.includes("ca8a04") ||
        hiliteVal.includes("254,240,138") || hiliteVal.includes("202,138,4") || hiliteVal.includes("fef08a") || hiliteVal.includes("ca8a04")
      ) {
        insideHighlight = true;
      }
    } catch (e) {}

    if (selection && selection.rangeCount > 0) {
      let node = selection.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const bg = node.style ? (node.style.backgroundColor || node.style.background) : "";
          const bgStr = bg.toLowerCase().replace(/\s+/g, "");
          const isHighlightBg = bgStr.includes("254,240,138") || 
                                bgStr.includes("202,138,4") || 
                                bgStr.includes("fef08a") || 
                                bgStr.includes("ca8a04") ||
                                bgStr.includes("rgba(254,240,138") ||
                                bgStr.includes("rgba(202,138,4");
          if (node.nodeName === "MARK" || isHighlightBg) {
            insideHighlight = true;
          }
          if (node.nodeName === "A") {
            insideLink = true;
          }
          if (node.nodeName === "UL" || node.nodeName === "OL") {
            if (node.classList.contains("checklist-list")) {
              insideChecklist = true;
            } else {
              insideBullet = true;
            }
          }
        }
        node = node.parentNode;
      }
    }

    setActiveStyles({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      highlight: insideHighlight,
      bullet: !insideChecklist && (insideBullet || document.queryCommandState("insertUnorderedList")),
      checklist: insideChecklist,
      link: insideLink || document.queryCommandState("createLink"),
      h1: document.queryCommandValue("formatBlock") === "h1",
      h2: document.queryCommandValue("formatBlock") === "h2",
      blockquote: document.queryCommandValue("formatBlock") === "blockquote",
      code: document.queryCommandValue("formatBlock") === "pre",
    });
  };

  const handleEditorClick = (e) => {
    if (!editorRef.current) return;
    
    // Legacy checkbox input click syncing
    if (e.target && e.target.type === "checkbox") {
      const checkbox = e.target;
      if (checkbox.checked) {
        checkbox.setAttribute("checked", "true");
      } else {
        checkbox.removeAttribute("checked");
      }
      setContent(editorRef.current.innerHTML);
      updateActiveStyles();
      return;
    }

    // Custom CSS checklists click toggling
    let node = e.target;
    while (node && node !== editorRef.current) {
      if (node.nodeName === "LI" && node.parentNode && node.parentNode.classList.contains("checklist-list")) {
        const rect = node.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        if (clickX >= 0 && clickX <= 28) {
          const isChecked = node.getAttribute("data-checked") === "true";
          if (isChecked) {
            node.removeAttribute("data-checked");
          } else {
            node.setAttribute("data-checked", "true");
          }
          setContent(editorRef.current.innerHTML);
        }
        break;
      }
      node = node.parentNode;
    }
    updateActiveStyles();
  };

  const handleToolbarAction = (action) => {
    if (!editorRef.current) return;
    
    // Only focus if not already focused, to prevent resetting selection/caret
    if (document.activeElement !== editorRef.current) {
      editorRef.current.focus();
    }

    switch (action) {
      case "bold":
        document.execCommand("bold", false, null);
        break;
      case "h1":
        document.execCommand("formatBlock", false, activeStyles.h1 ? "p" : "h1");
        break;
      case "h2":
        document.execCommand("formatBlock", false, activeStyles.h2 ? "p" : "h2");
        break;
      case "blockquote":
        document.execCommand("formatBlock", false, activeStyles.blockquote ? "p" : "blockquote");
        break;
      case "code":
        document.execCommand("formatBlock", false, activeStyles.code ? "p" : "pre");
        break;
      case "eraser":
        document.execCommand("removeFormat", false, null);
        document.execCommand("formatBlock", false, "p");
        break;
      case "italic":
        document.execCommand("italic", false, null);
        break;
      case "highlight":
        if (activeStyles.highlight) {
          const selection = window.getSelection();
          if (selection && selection.isCollapsed) {
            let node = selection.anchorNode;
            let highlightSpan = null;
            while (node && node !== editorRef.current) {
              if (node.nodeType === Node.ELEMENT_NODE && (node.nodeName === "SPAN" || node.nodeName === "MARK")) {
                const bg = node.style ? (node.style.backgroundColor || node.style.background) : "";
                const bgStr = bg.toLowerCase().replace(/\s+/g, "");
                if (bgStr.includes("254,240,138") || bgStr.includes("202,138,4") || bgStr.includes("fef08a") || bgStr.includes("ca8a04") || node.nodeName === "MARK") {
                  highlightSpan = node;
                  break;
                }
              }
              node = node.parentNode;
            }

            if (highlightSpan) {
              const zws = document.createTextNode("\u200B");
              if (highlightSpan.nextSibling) {
                highlightSpan.parentNode.insertBefore(zws, highlightSpan.nextSibling);
              } else {
                highlightSpan.parentNode.appendChild(zws);
              }
              const newRange = document.createRange();
              newRange.setStart(zws, 1);
              newRange.setEnd(zws, 1);
              selection.removeAllRanges();
              selection.addRange(newRange);
            } else {
              document.execCommand("hiliteColor", false, "transparent");
              document.execCommand("backColor", false, "transparent");
            }
          } else {
            document.execCommand("hiliteColor", false, "transparent");
            document.execCommand("backColor", false, "transparent");
          }
        } else {
          const color = getHighlightColor();
          document.execCommand("hiliteColor", false, color);
          document.execCommand("backColor", false, color);
        }
        break;
      case "bullet":
        document.execCommand("insertUnorderedList", false, null);
        break;
      case "checklist":
        if (activeStyles.checklist) {
          // Toggle off: remove class checklist-list from parent UL
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            let node = selection.anchorNode;
            while (node && node !== editorRef.current) {
              if (node.nodeName === "UL" && node.classList.contains("checklist-list")) {
                node.classList.remove("checklist-list");
                node.querySelectorAll("li").forEach(li => li.removeAttribute("data-checked"));
                break;
              }
              node = node.parentNode;
            }
          }
        } else {
          // Toggle on: First create list natively
          document.execCommand("insertUnorderedList", false, null);
          // Then find the UL parent and turn it into checklist-list
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            let node = selection.anchorNode;
            while (node && node !== editorRef.current) {
              if (node.nodeName === "UL") {
                node.classList.add("checklist-list");
                break;
              }
              node = node.parentNode;
            }
          }
        }
        break;
      case "link":
        if (activeStyles.link) {
          const selection = window.getSelection();
          if (selection && selection.isCollapsed) {
            let node = selection.anchorNode;
            let linkElement = null;
            while (node && node !== editorRef.current) {
              if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === "A") {
                linkElement = node;
                break;
              }
              node = node.parentNode;
            }

            if (linkElement) {
              const zws = document.createTextNode("\u200B");
              if (linkElement.nextSibling) {
                linkElement.parentNode.insertBefore(zws, linkElement.nextSibling);
              } else {
                linkElement.parentNode.appendChild(zws);
              }
              const newRange = document.createRange();
              newRange.setStart(zws, 1);
              newRange.setEnd(zws, 1);
              selection.removeAllRanges();
              selection.addRange(newRange);
            } else {
              document.execCommand("unlink", false, null);
            }
          } else {
            document.execCommand("unlink", false, null);
          }
        } else {
          const selection = window.getSelection();
          if (selection && selection.isCollapsed) {
            // Behave exactly like bold and italics: insert empty link with zero-width space
            const linkHtml = `<a href="#">&#8203;</a>`;
            document.execCommand("insertHTML", false, linkHtml);
          } else {
            document.execCommand("createLink", false, "#");
          }
        }
        break;
      default:
        break;
    }
    
    // Update content and active toolbar button highlights
    setContent(editorRef.current.innerHTML);
    updateActiveStyles();
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error("All fields are required");
      return;
    }

    setLoading(true);
    try {
      await api.post("/notes", {
        title,
        content,
        color,
        isPinned,
        folder,
      });
      toast.success("Note created successfully!");
      window.dispatchEvent(new CustomEvent("docket-refresh-notifications"));
      handleClose();
    } catch (error) {
      console.error("Error creating note", error);
      toast.error("Failed to create note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Translucent Backdrop */}
      <div 
        onClick={handleClose}
        className="absolute inset-0 drawer-backdrop cursor-pointer"
      />

      {/* Spacious Centered Canvas Panel */}
      <div className="relative w-full max-w-4xl h-[90vh] md:h-[82vh] bg-white dark:bg-zinc-950 border border-neutral-100 dark:border-zinc-800 shadow-2xl rounded-[2.5rem] flex flex-col z-10 overflow-hidden transition-all duration-300">
        
        {/* Color accent bars */}
        <div className="absolute top-0 inset-x-0 h-1.5 flex">
          <div className="flex-1 bg-[#FDB851]" />
          <div className="flex-1 bg-[#FF9E79]" />
          <div className="flex-1 bg-[#D4F48A]" />
          <div className="flex-1 bg-[#B386FF]" />
          <div className="flex-1 bg-[#00C6FF]" />
        </div>

        {/* Canvas Writing Body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 md:px-12 pt-10 pb-8 space-y-6">
          
          {/* Borderless Large Title Input with Star Pin & Close Toggles */}
          <div className="flex items-center justify-between gap-4 border-b border-neutral-100 dark:border-zinc-900/60 pb-4">
            <input
              type="text"
              placeholder="Give your thought a name..."
              className="flex-1 bg-transparent border-none text-2xl sm:text-3xl md:text-4xl font-extrabold text-black dark:text-white placeholder-neutral-300 dark:placeholder-zinc-600 focus:outline-none focus:ring-0 p-0 tracking-tight"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`size-11 sm:size-12 rounded-2xl flex items-center justify-center transition-all duration-300 border cursor-pointer hover:scale-105 active:scale-95 ${
                  isPinned
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                    : "bg-neutral-50 dark:bg-zinc-900 border-neutral-200 dark:border-zinc-800 text-neutral-400 hover:text-amber-500"
                }`}
                title={isPinned ? "Unpin Docket" : "Pin Docket"}
              >
                <Star className="size-5" fill={isPinned ? "currentColor" : "none"} />
              </button>
              
              <button
                type="button"
                onClick={handleClose}
                className="size-11 sm:size-12 rounded-2xl bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Close"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Editor Control Toolbar Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 dark:border-zinc-900/60 pb-3">
            {/* Rich Text Format Toolbar */}
            <div className="flex items-center flex-wrap gap-1">
              {[
                { name: "bold", icon: Bold, label: "Bold Text" },
                { name: "italic", icon: Italic, label: "Italics" },
                { name: "h1", icon: Heading1, label: "Heading 1" },
                { name: "h2", icon: Heading2, label: "Heading 2" },
                { name: "highlight", icon: Highlighter, label: "Highlight Text" },
                { name: "bullet", icon: List, label: "Bullet List" },
                { name: "checklist", icon: ListTodo, label: "Task Checklist" },
                { name: "blockquote", icon: Quote, label: "Blockquote" },
                { name: "code", icon: Code, label: "Code Block" },
                { name: "link", icon: Link2, label: "Insert Web Link" },
                { name: "eraser", icon: Eraser, label: "Clear Formatting" },
              ].map((btn) => {
                const IconComp = btn.icon;
                const isActive = activeStyles[btn.name];
                return (
                  <button
                    key={btn.name}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()} // prevent focus stealing!
                    onClick={() => handleToolbarAction(btn.name)}
                    className={`size-8 rounded-lg flex items-center justify-center transition-all border cursor-pointer ${
                      isActive
                        ? "bg-black text-white dark:bg-white dark:text-black border-transparent scale-105 shadow-sm font-bold"
                        : "bg-neutral-50 hover:bg-neutral-100 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-neutral-500 hover:text-neutral-800 dark:text-zinc-400 dark:hover:text-zinc-200 border-transparent hover:scale-105 active:scale-95"
                    }`}
                    title={btn.label}
                  >
                    <IconComp className="size-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inline WYSIWYG Content Editor */}
          <div className="form-control">
            <div
              id="note-content-textarea"
              ref={editorRef}
              contentEditable
              onInput={(e) => setContent(e.currentTarget.innerHTML)}
              onClick={handleEditorClick}
              onKeyUp={updateActiveStyles}
              onMouseUp={updateActiveStyles}
              className="w-full bg-transparent border-none text-base md:text-lg text-black dark:text-white leading-relaxed focus:outline-none focus:ring-0 p-0 min-h-[280px] md:min-h-[320px] outline-none select-text"
              data-placeholder="Spill your big ideas here... Let your mind flow. Select text and use the formatting toolbar above to add bold style, italics, text highlights, lists, hyperlinks, and interactive checkboxes!"
            />
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-neutral-100 dark:border-zinc-900 pt-6">
            {/* Color Palette Selector */}
            <ColorPaletteSelector selectedColor={color} onChange={setColor} />

            {/* Folder Config Panel */}
            <div className="space-y-4">
              {/* Category selector */}
              <div className="form-control">
                <label className="label mb-1.5">
                  <span className="text-sm font-semibold tracking-wide text-base-content/80">Category Folder</span>
                </label>
                <div className="relative">
                  <FolderKanban className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                  <select
                    className="w-full bg-neutral-50 dark:bg-zinc-900/60 border border-neutral-200 dark:border-zinc-800 rounded-2xl py-3.5 pl-11 pr-5 text-black dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-sm appearance-none cursor-pointer"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                  >
                    <option value="">None (Inbox note card)</option>
                    {folders.map((f) => (
                      <option key={f._id} value={f.name}>
                        Folder: {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Footer */}
        <div className="px-8 md:px-12 py-8 border-t border-neutral-100 dark:border-zinc-900 flex gap-4 bg-white dark:bg-zinc-950">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-4 border border-neutral-200 dark:border-zinc-800 rounded-2xl text-sm font-bold hover:bg-neutral-50 dark:hover:bg-zinc-900 active:scale-95 transition-all cursor-pointer text-center text-neutral-600 dark:text-zinc-300"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-sm font-bold hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <Save className="size-4.5" />
            <span>{loading ? "Creating..." : "Save Note"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePage;