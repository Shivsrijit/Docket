import Notification from "../models/Notification.js";

export const startNotificationWorker = () => {
  console.log("Background AI Notification Worker initialized.");
  
  // Executing interval loop every 10 seconds to deliver alerts in real-time
  setInterval(async () => {
    try {
      const now = new Date();
      
      // Querying all pending notifications due for delivery
      const dueNotifications = await Notification.find({
        status: "pending",
        scheduledAt: { $lte: now }
      });

      if (dueNotifications.length > 0) {
        console.log(`[Worker] Triggering ${dueNotifications.length} due notifications.`);
        
        // Transitioning status of due notifications to sent
        await Notification.updateMany(
          { _id: { $in: dueNotifications.map(n => n._id) } },
          { status: "sent" }
        );
      }
    } catch (error) {
      console.error("Error in background notification worker:", error.message);
    }
  }, 10000);
};
