import express from "express";
import { getAllFolders, createFolder, deleteFolder } from "../controllers/foldersController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getAllFolders);
router.post("/", createFolder);
router.delete("/:id", deleteFolder);

export default router;
