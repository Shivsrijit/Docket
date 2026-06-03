import express from "express";
import { getNotifications, getDueNotifications, replyToNotification, markAsRead, clearNotifications, getVapidPublicKey, subscribePush } from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getNotifications);
router.get("/due", getDueNotifications);
router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", subscribePush);
router.post("/:id/reply", replyToNotification);
router.post("/read", markAsRead);
router.delete("/clear", clearNotifications);

export default router;
