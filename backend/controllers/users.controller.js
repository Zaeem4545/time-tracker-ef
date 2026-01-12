const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all users
async function getAllUsers(req, res) {
  try {
    // Return all users for all roles to show in assigned_to dropdown across all portals
    const [rows] = await db.query('SELECT * FROM users ORDER BY role, email');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// Create new user (admin only)
async function createUser(req, res) {
  try {
    const { email, password, role = 'Engineer', contact_number, name } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    if (!contact_number || contact_number.trim() === '') {
      return res.status(400).json({ success: false, message: 'Contact number is required' });
    }

    // Validate contact number contains only digits
    if (!/^\d+$/.test(contact_number.trim())) {
      return res.status(400).json({ success: false, message: 'Contact number must contain only numbers' });
    }

    // Normalize role
    const normalizedRole = role.toLowerCase();
    const validRoles = ['admin', 'head manager', 'manager', 'engineer'];
    if (!validRoles.includes(normalizedRole)) {
      return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await db.query(
      'INSERT INTO users (email, password, role, contact_number, name) VALUES (?, ?, ?, ?, ?)',
      [email, passwordHash, normalizedRole, contact_number || null, name.trim()]
    );

    res.json({ success: true, message: 'User created successfully', user: { id: result.insertId, email, name, role: normalizedRole, contact_number } });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
}

// Update user info (email, role, contact_number, name) without password - admin only
async function updateUserInfo(req, res) {
  try {
    // Only admin can update users
    if (req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Only admins can update users.' });
    }

    const { id } = req.params;
    const { email, role, contact_number, name } = req.body;

    // Validate required fields
    if (!email || !role || !contact_number || contact_number.trim() === '') {
      return res.status(400).json({ success: false, message: "Email, role, and contact number are required" });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    // Validate contact number contains only digits
    if (!/^\d+$/.test(contact_number.trim())) {
      return res.status(400).json({ success: false, message: 'Contact number must contain only numbers' });
    }

    // Normalize role
    const normalizedRole = role.toLowerCase();
    const validRoles = ['admin', 'head manager', 'manager', 'engineer'];
    if (!validRoles.includes(normalizedRole)) {
      return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Check if email already exists for another user
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email.trim(), id]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists for another user' });
    }

    // Update user (email, role, contact_number, name only, password unchanged)
    const query = `UPDATE users SET email = ?, role = ?, contact_number = ?, name = ? WHERE id = ?`;
    await db.query(query, [email.trim(), normalizedRole, contact_number.trim(), name.trim(), id]);

    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
}

// Update user password only - admin can update any user, users can update their own password
async function updateUserPassword(req, res) {
  try {
    const { id } = req.params;
    const { currentPassword, password } = req.body;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role?.toLowerCase();

    // Validate required fields
    if (!currentPassword || !password) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    // Check permissions: Admin can update any user's password, others can only update their own
    if (requestingUserRole !== 'admin' && parseInt(id) !== requestingUserId) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only change your own password.' });
    }

    // Get user from database
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    // Check if new password is different from current password
    if (currentPassword === password) {
      return res.status(400).json({ success: false, message: 'New password must be different from current password' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password
    await db.query('UPDATE users SET password = ? WHERE id = ?', [passwordHash, id]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ success: false, message: 'Failed to update password' });
  }
}

// Update user role (legacy)
async function updateRole(req, res) {
  try {
    if (req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { id } = req.params;
    const { role } = req.body;
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.json({ success: true, message: 'Role updated successfully' });
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ success: false, message: 'Failed to update role' });
  }
}

// Update user (legacy)
async function updateUser(req, res) {
  try {
    if (req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { id } = req.params;
    const { email, password, role } = req.body;
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET email = ?, password = ?, role = ? WHERE id = ?', [email, passwordHash, role, id]);
    } else {
      await db.query('UPDATE users SET email = ?, role = ? WHERE id = ?', [email, role, id]);
    }
    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
}

// Delete user
async function deleteUser(req, res) {
  try {
    if (req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { id } = req.params;
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
}

// Notify managers when selected by head manager
async function notifySelectedManagers(req, res) {
  try {
    const { managerIds } = req.body;
    const headManagerId = req.user.id;
    // Get head manager name
    const [headManagerRows] = await db.query('SELECT name FROM users WHERE id = ?', [headManagerId]);
    const headManagerName = headManagerRows.length > 0 ? headManagerRows[0].name : 'Head Manager';
    const userRole = req.user.role?.toLowerCase();

    // Check if user is head manager
    if (userRole !== 'head manager') {
      return res.status(403).json({ success: false, message: 'Access denied. Only head managers can select managers.' });
    }

    if (!Array.isArray(managerIds) || managerIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Manager IDs array is required' });
    }

    // Verify all IDs are managers
    const placeholders = managerIds.map(() => '?').join(',');
    const [managerRows] = await db.query(
      `SELECT id, name FROM users WHERE id IN (${placeholders}) AND LOWER(role) = 'manager'`,
      managerIds
    );

    if (managerRows.length !== managerIds.length) {
      return res.status(400).json({ success: false, message: 'One or more manager IDs are invalid' });
    }

    // Send notification to each manager
    const Notification = require('../models/notification.model');
    const notifications = [];

    for (const manager of managerRows) {
      const notificationMessage = `You have been selected by ${headManagerName}`;
      try {
        const notificationId = await Notification.createNotification(manager.id, notificationMessage, 'manager_selection');
        notifications.push({ managerId: manager.id, notificationId });
        console.log(`Notification sent to manager ${manager.id} (${manager.name}): ${notificationMessage}`);
      } catch (notifError) {
        console.error(`Error sending notification to manager ${manager.id}:`, notifError);
        // Continue with other managers even if one fails
      }
    }

    // Notify all admins about manager selection
    try {
      const managerEmails = managerRows.map(m => m.email).join(', ');
      const adminMessage = `Head Manager ${headManagerEmail} has selected ${managerRows.length} manager(s): ${managerEmails}`;
      await Notification.notifyAllAdmins(adminMessage, 'manager_selected');
      console.log(`Admin notification sent: ${adminMessage}`);
    } catch (notifError) {
      console.error('Error sending admin notification for manager selection:', notifError);
      // Don't fail the request if notification creation fails
    }

    res.json({
      success: true,
      message: `Notifications sent to ${notifications.length} manager(s)`,
      notifications
    });
  } catch (error) {
    console.error('Error notifying selected managers:', error);
    res.status(500).json({ success: false, message: 'Failed to notify managers' });
  }
}

// Get all employees (for manager to select from)
async function getAllEmployees(req, res) {
  try {
    // Only managers can access this
    if (req.user.role.toLowerCase() !== 'manager') {
      return res.status(403).json({ success: false, message: 'Access denied. Only managers can view employees.' });
    }

    const [employees] = await db.query(
      "SELECT id, email, contact_number FROM users WHERE LOWER(role) = 'engineer' ORDER BY email"
    );

    res.json({ success: true, employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
}

// Get team members (employees assigned to current manager)
async function getTeamMembers(req, res) {
  try {
    const managerId = req.user.id;
    const userRole = req.user.role?.toLowerCase();

    // Check if user is manager
    if (userRole !== 'manager') {
      return res.status(403).json({ success: false, message: 'Access denied. Only managers can view team members.' });
    }

    const [teamMembers] = await db.query(
      `SELECT id, name, email, contact_number, role FROM users WHERE manager_id = ? ORDER BY email`,
      [managerId]
    );

    res.json(teamMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch team members' });
  }
}

// Get selected managers and their employees for head manager
async function getHeadManagerTeam(req, res) {
  try {
    const headManagerId = req.user.id;
    const userRole = req.user.role?.toLowerCase();

    // Check if user is head manager
    if (userRole !== 'head manager') {
      return res.status(403).json({ success: false, message: 'Access denied. Only head managers can view team details.' });
    }

    // Get manager IDs from query parameter or request body (sent from frontend localStorage)
    const managerIds = req.query.managerIds ? JSON.parse(req.query.managerIds) : (req.body.managerIds || []);

    let managerRows = [];
    let employees = [];

    if (managerIds && managerIds.length > 0) {
      // Get selected managers
      const placeholders = managerIds.map(() => '?').join(',');
      const [managerRowsResult] = await db.query(
        `SELECT id, email, contact_number, role
         FROM users
         WHERE id IN (${placeholders}) AND LOWER(role) = 'manager'
         ORDER BY email`,
        managerIds
      );
      managerRows = managerRowsResult;

      // Get employees for these managers
      const [employeeRows] = await db.query(
        `SELECT id, email, contact_number, role, manager_id 
         FROM users 
         WHERE manager_id IN (${placeholders}) AND LOWER(role) = 'engineer'
         ORDER BY manager_id, email`,
        managerIds
      );
      employees = employeeRows;
    }

    // Combine managers and employees
    const teamMembers = [
      ...managerRows.map(m => ({ ...m, role: 'manager' })),
      ...employees.map(e => ({ ...e, role: 'engineer' }))
    ];

    res.json(teamMembers);
  } catch (error) {
    console.error('Error fetching head manager team:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch team details' });
  }
}

// Assign employee to manager
async function assignEmployeeToManager(req, res) {
  try {
    const managerId = req.user.id;
    const { employeeId } = req.body;
    const userRole = req.user.role?.toLowerCase();

    // Check if user is manager
    if (userRole !== 'manager') {
      return res.status(403).json({ success: false, message: 'Access denied. Only managers can assign employees.' });
    }

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    // Verify employee exists and is an employee
    const [employeeRows] = await db.query(
      "SELECT id, email FROM users WHERE id = ? AND LOWER(role) = 'engineer'",
      [employeeId]
    );

    if (employeeRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID. User must be an employee.' });
    }

    const employee = employeeRows[0];

    // Check if employee is already assigned to another manager
    const [existingAssignment] = await db.query(
      'SELECT manager_id FROM users WHERE id = ?',
      [employeeId]
    );

    if (existingAssignment.length > 0 && existingAssignment[0].manager_id && existingAssignment[0].manager_id !== managerId) {
      return res.status(400).json({ success: false, message: 'Employee is already assigned to another manager.' });
    }

    // Assign employee to manager
    await db.query('UPDATE users SET manager_id = ? WHERE id = ?', [managerId, employeeId]);

    const Notification = require('../models/notification.model');
    // Get manager name
    const [managerRows] = await db.query('SELECT name FROM users WHERE id = ?', [managerId]);
    const managerName = managerRows.length > 0 ? managerRows[0].name : 'Manager';

    // Notify employee
    try {
      const notificationMessage = `You have been added to ${managerName}'s team`;
      await Notification.createNotification(employeeId, notificationMessage, 'team_assignment');
    } catch (notifError) {
      console.error('Error sending notification to employee:', notifError);
    }

    // Notify all admins
    try {
      const adminMessage = `Manager ${managerEmail} has added employee ${employee.email} to their team`;
      await Notification.notifyAllAdmins(adminMessage, 'employee_assigned');
    } catch (notifError) {
      console.error('Error sending admin notification:', notifError);
    }

    // Notify head managers
    try {
      const headManagerMessage = `Manager ${managerEmail} has added employee ${employee.email} to their team`;
      await Notification.notifyHeadManagersForManager(managerId, headManagerMessage, 'employee_assigned');
    } catch (notifError) {
      console.error('Error sending head manager notification:', notifError);
    }

    res.json({ success: true, message: 'Employee assigned successfully' });
  } catch (error) {
    console.error('Error assigning employee:', error);
    res.status(500).json({ success: false, message: 'Failed to assign employee' });
  }
}

// Remove employee from manager's team
async function removeEmployeeFromManager(req, res) {
  try {
    const managerId = req.user.id;
    const { employeeId } = req.body;
    const userRole = req.user.role?.toLowerCase();

    // Check if user is manager
    if (userRole !== 'manager') {
      return res.status(403).json({ success: false, message: 'Access denied. Only managers can remove employees.' });
    }

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    // Verify employee is assigned to this manager
    const [employeeRows] = await db.query(
      'SELECT id, email FROM users WHERE id = ? AND manager_id = ?',
      [employeeId, managerId]
    );

    if (employeeRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Employee is not assigned to your team.' });
    }

    const employee = employeeRows[0];

    // Remove employee from manager
    await db.query('UPDATE users SET manager_id = NULL WHERE id = ?', [employeeId]);

    const Notification = require('../models/notification.model');
    // Get manager name
    const [managerRows] = await db.query('SELECT name FROM users WHERE id = ?', [managerId]);
    const managerName = managerRows.length > 0 ? managerRows[0].name : 'Manager';

    // Notify employee
    try {
      const notificationMessage = `You have been removed from ${managerName}'s team`;
      await Notification.createNotification(employeeId, notificationMessage, 'team_removal');
    } catch (notifError) {
      console.error('Error sending notification to employee:', notifError);
    }

    // Notify all admins
    try {
      const adminMessage = `Manager ${managerEmail} has removed employee ${employee.email} from their team`;
      await Notification.notifyAllAdmins(adminMessage, 'employee_removed');
    } catch (notifError) {
      console.error('Error sending admin notification:', notifError);
    }

    // Notify head managers
    try {
      const headManagerMessage = `Manager ${managerEmail} has removed employee ${employee.email} from their team`;
      await Notification.notifyHeadManagersForManager(managerId, headManagerMessage, 'employee_removed');
    } catch (notifError) {
      console.error('Error sending head manager notification:', notifError);
    }

    res.json({ success: true, message: 'Employee removed successfully' });
  } catch (error) {
    console.error('Error removing employee:', error);
    res.status(500).json({ success: false, message: 'Failed to remove employee' });
  }
}

// Update user profile (self-update)
async function updateUserProfile(req, res) {
  try {
    const userId = req.user.id;
    const { name, contact_number, profile_picture } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    // Validate contact number contains only digits if provided
    if (contact_number && !/^\d+$/.test(contact_number.trim())) {
      return res.status(400).json({ success: false, message: 'Contact number must contain only numbers' });
    }

    const updates = ['name = ?'];
    const params = [name.trim()];

    if (contact_number !== undefined) {
      updates.push('contact_number = ?');
      params.push(contact_number.trim() || null);
    }

    if (profile_picture !== undefined) {
      updates.push('profile_picture = ?');
      params.push(profile_picture);
    }

    params.push(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await db.query(query, params);

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
}

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  updateUserInfo,
  updateUserPassword,
  updateRole,
  deleteUser,
  notifySelectedManagers,
  getAllEmployees,
  getTeamMembers,
  getHeadManagerTeam,
  assignEmployeeToManager,
  removeEmployeeFromManager,
  updateUserProfile
};
