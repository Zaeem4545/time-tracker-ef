const db = require('../config/db');
const TimeEntry = require('../models/timeEntry.model');

// Helper function to convert ISO datetime string to MySQL DATETIME format
function formatDateTimeForMySQL(isoString) {
  if (!isoString) return null;
  
  // If already in MySQL format (YYYY-MM-DD HH:MM:SS), return as is
  if (typeof isoString === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(isoString)) {
    return isoString;
  }
  
  // Convert ISO string to MySQL format
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return null;
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Get all time entries (Admin sees all, Manager/Head Manager see their team's entries, Employee sees their own and tasks they're assigned to)
async function getTimeEntries(req, res) {
  try {
    // All roles (Admin, Project Manager, Team Lead, Employee) see ALL time entries with no privacy restrictions
    const query = `
      SELECT t.id, t.start_time, t.end_time, t.status, t.total_time, t.task_name, t.description,
             t.user_id, u.email as employee_email, u.name as employee_name, u.id as user_id, u.role as user_role,
             p.name as project_name, p.id as project_id
      FROM time_entries t
      JOIN users u ON t.user_id = u.id
      JOIN projects p ON t.project_id = p.id
      ORDER BY t.start_time DESC
    `;

    const [rows] = await db.query(query, []);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// Start time tracking (All roles can start time tracking)
async function startTime(req, res) {
  try {
    const userId = req.user.id;
    const { project_id, task_name, description } = req.body;

    if (!project_id) {
      return res.status(400).json({ success: false, message: 'Project ID is required' });
    }

    if (!task_name || task_name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Task name is required' });
    }

    // Check if there's already an active time entry (no end_time)
    const [activeEntries] = await db.query(
      'SELECT id FROM time_entries WHERE user_id = ? AND end_time IS NULL',
      [userId]
    );

    if (activeEntries.length > 0) {
      return res.status(400).json({ success: false, message: 'You already have an active time entry. Please stop it first.' });
    }

    // Verify project exists
    const [projectRows] = await db.query('SELECT id FROM projects WHERE id = ?', [project_id]);
    if (projectRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid project ID' });
    }

    const entryId = await TimeEntry.startTime(userId, project_id, task_name || null, description || null);
    
    res.json({ success: true, message: 'Time tracking started', entryId });
  } catch (err) {
    console.error('Error starting time:', err);
    res.status(500).json({ success: false, message: 'Failed to start time tracking' });
  }
}

// Stop time tracking (All roles can stop their own time tracking)
async function stopTime(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify the time entry belongs to this user
    const [entryRows] = await db.query('SELECT id, user_id FROM time_entries WHERE id = ?', [id]);
    if (entryRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Time entry not found' });
    }

    if (entryRows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only stop your own time entries.' });
    }

    const totalTime = await TimeEntry.stopTime(id);
    
    res.json({ success: true, message: 'Time tracking stopped', totalTime });
  } catch (err) {
    console.error('Error stopping time:', err);
    res.status(500).json({ success: false, message: 'Failed to stop time tracking' });
  }
}

// Get active time entry for current user (All roles can view their own active time entries)
async function getActiveTimeEntry(req, res) {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT t.id, t.start_time, t.task_name, t.description, p.name as project_name
       FROM time_entries t
       JOIN projects p ON t.project_id = p.id
       WHERE t.user_id = ? AND t.end_time IS NULL
       ORDER BY t.start_time DESC
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.json({ success: true, activeEntry: null });
    }

    res.json({ success: true, activeEntry: rows[0] });
  } catch (err) {
    console.error('Error getting active time entry:', err);
    res.status(500).json({ success: false, message: 'Failed to get active time entry' });
  }
}

// Update/edit a time entry (Admin only)
async function updateTimeEntry(req, res) {
  try {
    const userRole = req.user.role?.toLowerCase();
    
    // Only admin can update time entries
    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Only admins can edit time entries.' });
    }
    
    const { id } = req.params;
    const { start_time, end_time, task_name, description, project_id } = req.body;
    
    // Verify time entry exists
    const [entryRows] = await db.query('SELECT id FROM time_entries WHERE id = ?', [id]);
    if (entryRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Time entry not found' });
    }
    
    // Build update query dynamically based on provided fields
    const updates = [];
    const params = [];
    
    if (start_time !== undefined) {
      updates.push('start_time = ?');
      params.push(formatDateTimeForMySQL(start_time));
    }
    
    if (end_time !== undefined) {
      updates.push('end_time = ?');
      params.push(formatDateTimeForMySQL(end_time));
    }
    
    if (task_name !== undefined) {
      updates.push('task_name = ?');
      params.push(task_name);
    }
    
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    
    if (project_id !== undefined) {
      updates.push('project_id = ?');
      params.push(project_id);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    // Recalculate total_time if start_time or end_time changed
    if (start_time !== undefined || end_time !== undefined) {
      const [currentEntryRows] = await db.query('SELECT start_time, end_time FROM time_entries WHERE id = ?', [id]);
      if (currentEntryRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Time entry not found' });
      }
      
      const currentEntry = currentEntryRows[0];
      // Get the start and end times - use provided values or fall back to current values
      const start = start_time !== undefined ? new Date(start_time) : (currentEntry.start_time ? new Date(currentEntry.start_time) : null);
      const end = end_time !== undefined ? new Date(end_time) : (currentEntry.end_time ? new Date(currentEntry.end_time) : null);
      
      // Only calculate total_time if both start and end are valid
      if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (end > start) {
          const totalTimeMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
          updates.push('total_time = ?');
          params.push(totalTimeMinutes);
        } else {
          return res.status(400).json({ success: false, message: 'Invalid time range. End time must be after start time.' });
        }
      } else {
        // If we can't calculate total_time, that's okay - it will remain unchanged
        console.warn('Could not calculate total_time for entry', id, 'start:', start, 'end:', end);
      }
    }
    
    params.push(id);
    
    const updateQuery = `UPDATE time_entries SET ${updates.join(', ')} WHERE id = ?`;
    console.log('Update query:', updateQuery);
    console.log('Update params:', params);
    
    await db.query(updateQuery, params);
    
    res.json({ success: true, message: 'Time entry updated successfully' });
  } catch (err) {
    console.error('Error updating time entry:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update time entry: ' + (err.message || 'Unknown error') 
    });
  }
}

// Delete a time entry (Admin only)
async function deleteTimeEntry(req, res) {
  try {
    const userRole = req.user.role?.toLowerCase();
    
    // Only admin can delete time entries
    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Only admins can delete time entries.' });
    }
    
    const { id } = req.params;
    
    // Verify time entry exists
    const [entryRows] = await db.query('SELECT id FROM time_entries WHERE id = ?', [id]);
    if (entryRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Time entry not found' });
    }
    
    await db.query('DELETE FROM time_entries WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Time entry deleted successfully' });
  } catch (err) {
    console.error('Error deleting time entry:', err);
    res.status(500).json({ success: false, message: 'Failed to delete time entry' });
  }
}

// Clear all time entries (Admin only)
async function clearAllTimeEntries(req, res) {
  try {
    const userRole = req.user.role?.toLowerCase();
    
    // Only admin can clear all time entries
    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Only admins can clear all time entries.' });
    }
    
    const [result] = await db.query('DELETE FROM time_entries');
    
    res.json({ success: true, message: `All time entries cleared successfully. ${result.affectedRows} entries deleted.` });
  } catch (err) {
    console.error('Error clearing all time entries:', err);
    res.status(500).json({ success: false, message: 'Failed to clear all time entries' });
  }
}

// Create a time entry manually (All roles can create time entries)
async function createTimeEntry(req, res) {
  try {
    const userRole = req.user.role?.toLowerCase();
    const currentUserId = req.user.id;
    
    const { user_id, project_id, task_name, description, start_time, end_time } = req.body;
    
    // All roles can create time entries, but they can only create entries for themselves
    // Admin can create entries for any user
    const targetUserId = user_id || currentUserId;
    
    if (userRole !== 'admin' && targetUserId !== currentUserId) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only create time entries for yourself.' });
    }
    
    // Validate required fields (user_id is optional, defaults to current user)
    if (!project_id || !task_name || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'project_id, task_name, start_time, and end_time are required' });
    }
    
    // Verify user exists
    const [userRows] = await db.query('SELECT id FROM users WHERE id = ?', [targetUserId]);
    if (userRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    
    // Verify project exists
    const [projectRows] = await db.query('SELECT id FROM projects WHERE id = ?', [project_id]);
    if (projectRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid project ID' });
    }
    
    // Validate dates
    const start = new Date(start_time);
    const end = new Date(end_time);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format for start_time or end_time' });
    }
    
    if (end <= start) {
      return res.status(400).json({ success: false, message: 'end_time must be after start_time' });
    }
    
    // Calculate total time in minutes
    const totalTimeMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    
    // Insert time entry (status will use default value if column exists)
    const [result] = await db.query(
      `INSERT INTO time_entries (user_id, project_id, task_name, description, start_time, end_time, total_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [targetUserId, project_id, task_name.trim(), description?.trim() || null, formatDateTimeForMySQL(start_time), formatDateTimeForMySQL(end_time), totalTimeMinutes]
    );
    
    res.json({ success: true, message: 'Time entry created successfully', entryId: result.insertId });
  } catch (err) {
    console.error('Error creating time entry:', err);
    console.error('Error details:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Failed to create time entry: ' + (err.message || 'Unknown error') });
  }
}

module.exports = { getTimeEntries, startTime, stopTime, getActiveTimeEntry, updateTimeEntry, deleteTimeEntry, clearAllTimeEntries, createTimeEntry };
