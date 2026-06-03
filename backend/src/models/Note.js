import mongoose from "mongoose";

// Defining notes database schema 
const noteSchema = new mongoose.Schema(
    {
        title: {
            type:String, 
            required: true,
        }, 
        content: {
            type:String, 
            required:true,
        }, 
        color: {
            type:String,
            default: "#FDB851",
        },
        isPinned: {
            type:Boolean,
            default: false,
        },
        folder: {
            type: String,
            default: "",
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    }, 
    {
        timestamps:true, // Enabling automated timestamp generation for creations and modifications
    }
)

// Compiling and exporting Note model based on notes schema
const Note = mongoose.model("Note", noteSchema) ;

export default Note ; 