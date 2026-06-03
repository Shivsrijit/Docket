import Notification from "../models/Notification.js";
import PushSubscription from "../models/PushSubscription.js";
import webpush from "web-push";

const PERSONA_NAMES = {
  Therapist: "Docket's Doctor",
  LifePartner: "Docket's Companion",
  Secretary: "Docket's Secretary",
  Friend: "Docket's Friend",
  Teacher: "Docket's Teacher"
};

export const startNotificationWorker = () => {
  console.log("Background AI Notification Worker initialized.");
  
  // Set VAPID details inside worker process scope if keys are loaded
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
      webpush.setVapidDetails(
        "mailto:docket-admin@yopmail.com",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    } catch (err) {
      console.error("Worker webpush config failed:", err.message);
    }
  }

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

        // Fetch subscriptions and trigger web push alerts
        for (const notification of dueNotifications) {
          try {
            const subscriptions = await PushSubscription.find({ user: notification.user });
            if (subscriptions.length > 0) {
              const payload = JSON.stringify({
                title: PERSONA_NAMES[notification.persona] || "Docket Assistant",
                message: notification.message,
                persona: notification.persona,
                url: "/"
              });

              for (const subRecord of subscriptions) {
                try {
                  await webpush.sendNotification(subRecord.subscription, payload);
                } catch (pushErr) {
                  // If subscription has expired or is invalid (404/410), delete it
                  if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
                    console.log(`[Worker] Pruning expired push subscription: ${subRecord._id}`);
                    await PushSubscription.deleteOne({ _id: subRecord._id });
                  } else {
                    console.error(`[Worker] Push notification failed for subscription ${subRecord._id}:`, pushErr.message);
                  }
                }
              }
            }
          } catch (notifErr) {
            console.error(`[Worker] Error sending push for notification ${notification._id}:`, notifErr.message);
          }
        }
      }
    } catch (error) {
      console.error("Error in background notification worker:", error.message);
    }
  }, 10000);
};
