import express from "express" ;
import { getAllNotes, createNote, updateNote, deleteNote, getNoteById} from "../controllers/notesController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router() ; 

router.use(protect); 

router.get("/", getAllNotes);

router.post("/", createNote);

router.put("/:id", updateNote) ;
 
router.delete("/:id", deleteNote);

router.get("/:id", getNoteById) ;

export default router ; 