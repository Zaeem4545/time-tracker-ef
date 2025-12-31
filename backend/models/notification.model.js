const db = require('../config/db');

// Get all admin user IDs
async function getAdminUserIds() {
  try {
    const [rows] = await db.query("SELECT id FROM users WHERE LOWER(role) = 'admin'");
    return rows.map(row => row.id);
  } catch (error) {
    console.error('Error fetching admin user IDs:', error);
    return [];
  }
}

// Get all manager user IDs
async function getManagerUserIds() {
  try {
    const [rows] = await db.query("SELECT id FROM users WHERE LOWER(role) = 'manager'");
    return rows.map(row => row.id);
  } catch (error) {
    console.error('Error fetching manager user IDs:', error);
    return [];
  }
}

// Get all head manager user IDs
async function getHeadManagerUserIds() {
  try {
    const [rows] = await db.query("SELECT id FROM users WHERE LOWER(role) = 'head manager'");
    return rows.map(row => row.id);
  } catch (error) {
    console.error('Error fetching head manager user IDs:', error);
    return [];
  }
}

// Create notifications for all managers
async function notifyAllManagers(message, type = 'info') {
  try {
    const managerIds = await getManagerUserIds();
    const notificationIds = [];
    
    for (const managerId of managerIds) {
      try {
        const notificationId = await createNotification(managerId, message, type);
        notificationIds.push(notificationId);
      } catch (notifError) {
        console.error(`Error sending notification to manager ${managerId}:`, notifError);
        // Continue with other managers even if one fails
      }
    }
    
    return notificationIds;
  } catch (error) {
    console.error('Error notifying managers:', error);
    return [];
  }
}

// Create notifications for all head managers
async function notifyAllHeadManagers(message, type = 'info') {
  try {
    const headManagerIds = await getHeadManagerUserIds();
    const notificationIds = [];
    
    for (const headManagerId of headManagerIds) {
      try {
        const notificationId = await createNotification(headManagerId, message, type);
        notificationIds.push(notificationId);
      } catch (notifError) {
        console.error(`Error sending notification to head manager ${headManagerId}:`, notifError);
        // Continue with other head managers even if one fails
      }
    }
    
    return notificationIds;
  } catch (error) {
    console.error('Error notifying head managers:', error);
    return [];
  }
}

// Get head manager IDs for a given manager
// This finds head managers who have selected projects assigned to this manager
async function getHeadManagersForManager(managerId) {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT hmp.head_manager_id as id
       FROM head_manager_projects hmp
       INNER JOIN projects p ON hmp.project_id = p.id
       WHERE p.manager_id = ?
       AND EXISTS (
         SELECT 1 FROM users u 
         WHERE u.id = hmp.head_manager_id 
         AND LOWER(u.role) = 'head manager'
       )`,
      [managerId]
    );
    return rows.map(row => row.id);
  } catch (error) {
    console.error('Error fetching head managers for manager:', error);
    return [];
  }
}

// Create notifications for head managers of a given manager
async function notifyHeadManagersForManager(managerId, message, type = 'info') {
  try {
    const headManagerIds = await getHeadManagersForManager(managerId);
    const notificationIds = [];
    
    for (const headManagerId of headManagerIds) {
      try {
        const notificationId = await createNotification(headManagerId, message, type);
        notificationIds.push(notificationId);
      } catch (notifError) {
        console.error(`Error sending notification to head manager ${headManagerId}:`, notifError);
        // Continue with other head managers even if one fails
      }
    }
    
    return notificationIds;
  } catch (error) {
    console.error('Error notifying head managers:', error);
    return [];
  }
}

// Create a notification
async function createNotification(userId, message, type = 'info') {
  try {
    const [result] = await db.query(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [userId, message, type]
    );
    return result.insertId;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Create notifications for all admins
async function notifyAllAdmins(message, type = 'info') {
  try {
    const adminIds = await getAdminUserIds();
    const notificationIds = [];
    
    for (const adminId of adminIds) {
      try {
        const notificationId = await createNotification(adminId, message, type);
        notificationIds.push(notificationId);
      } catch (notifError) {
        console.error(`Error sending notification to admin ${adminId}:`, notifError);
        // Continue with other admins even if one fails
      }
    }
    
    return notificationIds;
  } catch (error) {
    console.error('Error notifying admins:', error);
    return [];
  }
}

// Get all notifications for a user
async function getUserNotifications(userId) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
}

// Get unread notifications count for a user
async function getUnreadCount(userId) {
  try {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return rows[0].count;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }
}

// Mark notification as read
async function markAsRead(notificationId, userId) {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

// Mark all notifications as read for a user
async function markAllAsRead(userId) {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  notifyAllAdmins,
  getAdminUserIds,
  getHeadManagersForManager,
  notifyHeadManagersForManager,
  getManagerUserIds,
  getHeadManagerUserIds,
  notifyAllManagers,
  notifyAllHeadManagers
};

