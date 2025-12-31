const express = require('express');
const router = express.Router();
const { getNotifications, getUnreadCount, markAsRead, markAllAsRead } = require('../controllers/notifications.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, getNotifications);
router.get('/unread-count', authMiddleware, getUnreadCount);
router.put('/all/read', authMiddleware, markAllAsRead); // Must come before /:id/read
router.put('/:id/read', authMiddleware, markAsRead);

module.exports = router;

