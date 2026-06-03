import express from "express";
import { getNotifications, getDueNotifications, replyToNotification, markAsRead, clearNotifications } from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getNotifications);
router.get("/due", getDueNotifications);
router.post("/:id/reply", replyToNotification);
router.post("/read", markAsRead);
router.delete("/clear", clearNotifications);

export default router;
