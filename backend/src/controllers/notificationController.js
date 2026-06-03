import Notification from "../models/Notification.js";
import { generateFollowUp } from "../services/aiService.js";

export const getNotifications = async (req, res) => {
  try {
    const list = await Notification.find({ user: req.user._id, status: { $in: ["sent", "replied"] } })
      .sort({ updatedAt: -1 })
      .limit(30);
    res.status(200).json(list);
  } catch (error) {
    console.error("Error in getNotifications controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getDueNotifications = async (req, res) => {
  try {
    // Find sent but unread notifications to push directly to active client
    const due = await Notification.find({ user: req.user._id, status: "sent", isRead: false });
    
    // Mark them read immediately so they aren't delivered repeatedly in next polling tick
    if (due.length > 0) {
      await Notification.updateMany(
        { _id: { $in: due.map(n => n._id) } },
        { isRead: true }
      );
    }
    res.status(200).json(due);
  } catch (error) {
    console.error("Error in getDueNotifications controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const replyToNotification = async (req, res) => {
  try {
    const { response } = req.body;
    if (!response || !response.trim()) {
      return res.status(400).json({ message: "Response content is required" });
    }

    const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found or unauthorized" });
    }

    notification.status = "replied";
    notification.userResponse = response.trim();
    notification.isRead = true;
    await notification.save();

    // Trigger asynchronous AI dialog generator to auto-schedule the next empathetic follow-up
    generateFollowUp(notification, response.trim());

    res.status(200).json(notification);
  } catch (error) {
    console.error("Error in replyToNotification controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const markAsRead = async (req, res) => {
  try {
    // Only mark notifications as read if they have already been delivered/sent to the user (status: "sent" or "replied")
    await Notification.updateMany(
      { user: req.user._id, status: { $in: ["sent", "replied"] }, isRead: false },
      { isRead: true }
    );
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error in markAsRead controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id, status: { $in: ["sent", "replied"] } });
    res.status(200).json({ message: "Notification history cleared successfully" });
  } catch (error) {
    console.error("Error in clearNotifications controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

