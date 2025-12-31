const Notification = require('../models/notification.model');

// Get all notifications for the current user
async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const notifications = await Notification.getUserNotifications(userId);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
}

// Get unread notifications count
async function getUnreadCount(req, res) {
  try {
    const userId = req.user.id;
    const count = await Notification.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
}

// Mark notification as read
async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await Notification.markAsRead(id, userId);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
}

// Mark all notifications as read
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;
    await Notification.markAllAsRead(userId);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};

