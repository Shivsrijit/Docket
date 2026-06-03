import { trusted } from "mongoose";
import Note from "../models/Note.js";
import Notification from "../models/Notification.js";
import { analyzeNoteAndSchedule, cancelAnalysis } from "../services/aiService.js";

export async function getAllNotes(req, res){
    try{
        const notes = await Note.find({ user: req.user._id }).sort({createdAt:-1}) ;
        res.status(200).json(notes) ;
    }catch(error){
        console.error("Error in getAllNotes controller", error); 
        res.status(500).json({message:"Internal Server Error"}); 
    }
}
 
export async function createNote(req,res){
    try {
        const {title , content, color, isPinned, folder } = req.body ; 
        const note = new Note({title, content, color, isPinned, folder, user: req.user._id}) ; 

        const savedNote = await note.save();
        
        // Trigger asynchronous AI analysis to schedule alerts if worthy
        analyzeNoteAndSchedule(savedNote, req.headers["x-client-time"]);

        res.status(201).json(savedNote); 
    } catch (error) {
        console.error("Error in createNote controller", error);
        res.status(500).json({message:"Internal server error"}) ;        
    }
} ; 

export async function updateNote(req, res){
    try {
        const {title , content, color, isPinned, folder} = req.body ; 

        // Find the existing note to compare title and content changes
        const existingNote = await Note.findOne({ _id: req.params.id, user: req.user._id });
        if(!existingNote){
            return res.status(404).json({message:"Id not found or not authorized"})
        }

        const isTextChanged = existingNote.title !== title || existingNote.content !== content;

        const updatedNote = await Note.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id }, 
            {title, content, color, isPinned, folder},
            {returnDocument: 'after'}
        );

        // Trigger AI analysis ONLY when note text has actually changed
        if (isTextChanged) {
            analyzeNoteAndSchedule(updatedNote, req.headers["x-client-time"]);
        }

        res.status(200).json(updatedNote) ;
    } catch (error) {
        console.log("error in updateNote controller", error); 
        res.status(500).json({message:"Internal server error"}) ;
    }
} ; 

export const deleteNote = async (req,res)=>{
    try {
        const deletedNote = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if(!deletedNote){
            return res.status(404).json({message:"Note id not found or not authorized"}) ;
        }

        // Clean up any pending or sent notifications linked to the deleted note
        await Notification.deleteMany({ note: req.params.id });

        // Cancel any pending debounced AI analysis for this note
        cancelAnalysis(req.params.id);

        res.status(200).json(deletedNote) ;
    } catch (error) {
        console.log("Error in deleteNote controller", error); 
        res.status(500).json({message:"Internal server error"}) ;
    }
}

export const getNoteById = async(req,res) =>{
    try {
        const note = await Note.findOne({ _id: req.params.id, user: req.user._id }) ;
        if(!note){
            return res.status(404).json({message:"Note not found or not authorized"}) ;
        }
        res.status(200).json(note) ;
    } catch (error) {
        console.log("error in getNoteById controller", error); 
        res.status(500).json({message:"Internal server error"}) ; 
    }
}