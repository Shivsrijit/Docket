import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
      default: null,
    },
    message: {
      type: String,
      required: true,
    },
    persona: {
      type: String,
      enum: ["Therapist", "LifePartner", "Secretary", "Friend", "Teacher"],
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "replied"],
      default: "pending",
    },
    quickReplies: {
      type: [String],
      default: ["Yes", "No"],
    },
    userResponse: {
      type: String,
      default: "",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexing to support high-efficiency status and schedule queries
notificationSchema.index({ status: 1, scheduledAt: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
