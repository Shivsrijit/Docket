import Folder from "../models/Folder.js";
import Note from "../models/Note.js";

// Fetch all folders
export async function getAllFolders(req, res) {
  try {
    const folders = await Folder.find({ user: req.user._id }).sort({ createdAt: 1 });
    res.status(200).json(folders);
  } catch (error) {
    console.error("Error in getAllFolders controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Create folder
export async function createFolder(req, res) {
  try {
    const { name, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    // Check unique folder name for this user
    const existing = await Folder.findOne({ name: name.trim(), user: req.user._id });
    if (existing) {
      return res.status(400).json({ message: "Category name already exists" });
    }

    const folder = new Folder({
      name: name.trim(),
      color: color || "#B386FF",
      user: req.user._id,
    });

    const savedFolder = await folder.save();
    res.status(201).json(savedFolder);
  } catch (error) {
    console.error("Error in createFolder controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Delete folder & reset notes in that folder to uncategorized
export async function deleteFolder(req, res) {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, user: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: "Category folder not found or not authorized" });
    }

    const folderName = folder.name;

    // Delete the folder
    await Folder.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    // Update notes inside this folder to uncategorized for this user
    await Note.updateMany({ folder: folderName, user: req.user._id }, { folder: "" });

    res.status(200).json({ message: "Folder deleted and notes uncategorized", deletedFolderId: req.params.id });
  } catch (error) {
    console.error("Error in deleteFolder controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
