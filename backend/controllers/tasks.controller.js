const Task = require('../models/task.model');
const Notification = require('../models/notification.model');
const db = require('../config/db');
const googleSheetsService = require('../services/googleSheets.service');
const projectModel = require('../models/project.model');
const emailService = require('../services/email.service');

// Helper function to notify project followers
async function notifyProjectFollowers(projectId, subject, message, userId, htmlMessage = null) {
  try {
    const followers = await projectModel.getProjectFollowers(projectId);
    const followerEmails = followers.map(f => f.email).filter(Boolean);
    const followerIds = followers.map(f => f.id);

    if (followerEmails.length > 0) {
      // Use provided HTML message or default plain text wrapped in p tag
      const emailHtml = htmlMessage || `<p>${message}</p>`;
      await emailService.sendEmail(followerEmails, subject, emailHtml);
    }

    for (const followerId of followerIds) {
      if (followerId !== userId) {
        await Notification.createNotification(followerId, message, 'project_update');
      }
    }
  } catch (error) {
    console.error('Error notifying project followers:', error);
  }
}

// Helper function to log task history
async function logTaskHistory(taskId, projectId, action, fieldName, oldValue, newValue, taskTitle, userId, userName, userEmail) {
  try {
    await db.query(`
      INSERT INTO task_history (task_id, project_id, action, field_name, old_value, new_value, task_title, changed_by, changed_by_name, changed_by_email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [taskId, projectId, action, fieldName, oldValue ? String(oldValue) : null, newValue ? String(newValue) : null, taskTitle, userId, userName, userEmail]);
  } catch (error) {
    console.error('Error logging task history:', error);
    // Don't throw - history logging failure shouldn't break the main operation
  }
}

// Helper function to convert HH:MM:SS to total seconds
function timeToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours * 3600 + minutes * 60;
  }
  return 0;
}

// Helper function to convert total seconds to HH:MM:SS format
function secondsToTime(totalSeconds) {
  if (!totalSeconds || totalSeconds < 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Get all tasks for a project
async function getTasksByProject(req, res) {
  try {
    const { projectId } = req.params;
    const userRole = req.user.role?.toLowerCase();
    const userId = req.user.id;

    let tasks;

    // All roles (including employees) see all tasks for the project
    // Employees can work on any task in timesheet
    tasks = await Task.getTasksByProject(projectId);

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
}

// Get single task
async function getTaskById(req, res) {
  try {
    const { id } = req.params;
    const task = await Task.getTaskById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch task' });
  }
}

// Create a task
async function createTask(req, res) {
  try {
    const { project_id, title, description, status, assigned_to, assigned_by, due_date, allocated_time } = req.body;

    console.log('Create task request body:', req.body);

    if (!project_id || !title || title.trim() === '') {
      return res.status(400).json({ message: 'Project ID and task title are required' });
    }

    // assigned_to is optional for all roles - no validation needed

    // Auto-set assigned_by to current user's name for all roles
    // Get current user's name from database
    const [userRows] = await db.query('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
    const userName = userRows.length > 0 ? userRows[0].name : null;
    const userEmail = userRows.length > 0 ? userRows[0].email : '';
    const normalizedAssignedBy = userName; // Always use the creator's name
    const userRole = req.user.role?.toLowerCase();
    const userId = req.user.id;

    // Parse assigned_to if provided, otherwise set to null
    let assignedToValue = null;
    if (assigned_to && assigned_to !== '' && assigned_to !== null && assigned_to !== undefined) {
      assignedToValue = parseInt(assigned_to);
      if (isNaN(assignedToValue) || assignedToValue <= 0) {
        assignedToValue = null;
      }
    }

    // If employee creates a task and doesn't assign it to anyone, assign it to themselves
    // This ensures the task shows up in their "My Tasks" dashboard immediately
    if (userRole === 'engineer' && !assignedToValue) {
      assignedToValue = userId;
    }

    const taskData = {
      project_id: parseInt(project_id),
      title: title.trim(),
      description: description && description.trim() !== '' ? description.trim() : null,
      status: status || 'pending',
      assigned_to: assignedToValue,
      assigned_by: normalizedAssignedBy,
      due_date: due_date && due_date.trim() !== '' ? due_date : null,
      allocated_time: allocated_time && allocated_time.trim() !== '' ? allocated_time.trim() : null,
      custom_fields: req.body.custom_fields || null
    };

    console.log('Normalized task data:', taskData);

    const task = await Task.createTask(taskData);

    // Log task creation in history
    await logTaskHistory(task.id, project_id, 'create', null, null, null, title.trim(), req.user.id, userName || 'Unknown User', userEmail);

    // Send notification to the assigned employee (only if assigned_to is provided)
    if (taskData.assigned_to) {
      try {
        // Get project name for the notification message
        const [projectRows] = await db.query('SELECT name FROM projects WHERE id = ?', [project_id]);
        const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';

        // Get assigned user name for logging
        const [userRows] = await db.query('SELECT name FROM users WHERE id = ?', [taskData.assigned_to]);
        const assignedUserName = userRows.length > 0 ? userRows[0].name : 'Employee';

        // Get assigner name
        const [assignerRows] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
        const assignerName = assignerRows.length > 0 ? assignerRows[0].name : 'Manager';
        const notificationMessage = `You have been assigned to task "${title}" in project "${projectName}" by ${assignerName}`;

        await Notification.createNotification(taskData.assigned_to, notificationMessage, 'task_assigned');
        console.log(`Task assignment notification sent to employee ${taskData.assigned_to} (${assignedUserName}): ${notificationMessage}`);
      } catch (notifError) {
        console.error('Error sending task assignment notification:', notifError);
        // Don't fail the request if notification creation fails
      }
    }

    // Notify head managers if task is created by a manager
    if (req.user.role?.toLowerCase() === 'manager') {
      try {
        const managerId = req.user.id;
        const [projectRows] = await db.query('SELECT name, manager_id FROM projects WHERE id = ?', [project_id]);
        const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';
        const projectManagerId = projectRows.length > 0 ? projectRows[0].manager_id : null;

        // Only notify if the manager is assigned to this project
        if (projectManagerId === managerId) {
          // Get manager name
          const [managerRows] = await db.query('SELECT name FROM users WHERE id = ?', [managerId]);
          const managerName = managerRows.length > 0 ? managerRows[0].name : 'Manager';
          let headManagerMessage;

          if (taskData.assigned_to) {
            const [assignedUserRows] = await db.query('SELECT name FROM users WHERE id = ?', [taskData.assigned_to]);
            const assignedUserName = assignedUserRows.length > 0 ? assignedUserRows[0].name : 'Employee';
            headManagerMessage = `Manager ${managerName} has created a new task "${title}" in project "${projectName}" and assigned it to ${assignedUserName}`;
          } else {
            headManagerMessage = `Manager ${managerEmail} has created a new task "${title}" in project "${projectName}"`;
          }

          await Notification.notifyHeadManagersForManager(managerId, headManagerMessage, 'task_created');
          console.log(`Task creation notification sent to head managers for manager ${managerId}: ${headManagerMessage}`);
        }
      } catch (notifError) {
        console.error('Error sending head manager notification for task creation:', notifError);
        // Don't fail the request if notification creation fails
      }
    }

    // Notify admin, manager, and head manager if task is created by an employee
    if (userRole === 'engineer') {
      try {
        const [projectRows] = await db.query('SELECT name FROM projects WHERE id = ?', [project_id]);
        const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';
        // Get creator name
        const [creatorRows] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
        const creatorName = creatorRows.length > 0 ? creatorRows[0].name : 'Employee';

        let taskMessage;
        if (taskData.assigned_to) {
          const [assignedUserRows] = await db.query('SELECT name FROM users WHERE id = ?', [taskData.assigned_to]);
          const assignedUserName = assignedUserRows.length > 0 ? assignedUserRows[0].name : 'Employee';
          taskMessage = `Employee ${creatorName} has created a new task "${title}" in project "${projectName}" and assigned it to ${assignedUserName}`;
        } else {
          taskMessage = `Employee ${creatorName} has created a new task "${title}" in project "${projectName}"`;
        }

        // Notify all admins
        await Notification.notifyAllAdmins(taskMessage, 'task_created');
        console.log(`Task creation notification sent to admins: ${taskMessage}`);

        // Notify all managers
        await Notification.notifyAllManagers(taskMessage, 'task_created');
        console.log(`Task creation notification sent to managers: ${taskMessage}`);

        // Notify all head managers
        await Notification.notifyAllHeadManagers(taskMessage, 'task_created');
        console.log(`Task creation notification sent to head managers: ${taskMessage}`);
      } catch (notifError) {
        console.error('Error sending notifications for employee task creation:', notifError);
        // Don't fail the request if notification creation fails
      }
    }

    // Notify all admins about task creation (for non-employee roles)
    // Employee notifications are handled separately above
    if (userRole !== 'engineer') {
      try {
        const [projectRows] = await db.query('SELECT name FROM projects WHERE id = ?', [project_id]);
        const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';
        // Get creator name
        const [creatorRows] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
        const creatorName = creatorRows.length > 0 ? creatorRows[0].name : 'User';
        const creatorRole = req.user.role || 'User';

        let adminMessage;
        if (taskData.assigned_to) {
          const [assignedUserRows] = await db.query('SELECT name FROM users WHERE id = ?', [taskData.assigned_to]);
          const assignedUserName = assignedUserRows.length > 0 ? assignedUserRows[0].name : 'Employee';
          adminMessage = `${creatorRole} ${creatorName} has created a new task "${title}" in project "${projectName}" and assigned it to ${assignedUserName}`;
        } else {
          adminMessage = `${creatorRole} ${creatorName} has created a new task "${title}" in project "${projectName}"`;
        }

        await Notification.notifyAllAdmins(adminMessage, 'task_created');
        console.log(`Admin notification sent for task creation: ${adminMessage}`);
      } catch (notifError) {
        console.error('Error sending admin notification for task creation:', notifError);
        // Don't fail the request if notification creation fails
      }
    }

    // Sync to Google Sheets (non-blocking)
    googleSheetsService.syncTask('create', task).catch(err => {
      console.error('Error syncing task to Google Sheets:', err);
    });

    // Notify project followers
    try {
      const [projectRows] = await db.query('SELECT name FROM projects WHERE id = ?', [project_id]);
      const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';
      const projectFollowerSubject = `New Task: ${title} in Project ${projectName}`;
      const projectFollowerMessage = `A new task "${title}" has been created in project "${projectName}" by ${userName || 'a user'}.`;
      await notifyProjectFollowers(project_id, projectFollowerSubject, projectFollowerMessage, req.user.id);
    } catch (followerError) {
      console.error('Error notifying followers:', followerError);
    }

    res.json({ success: true, task });
  } catch (err) {
    console.error('Error creating task:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: 'Failed to create task: ' + (err.message || 'Unknown error') });
  }
}

// Update a task
async function updateTask(req, res) {
  try {
    const { id } = req.params;
    const { title, description, status, assigned_to, assigned_by, due_date, archived, custom_fields, allocated_time } = req.body;

    // assigned_to is optional - no validation needed

    // Get the current task to check if assigned_to or status changed
    const currentTask = await Task.getTaskById(id);
    if (!currentTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const previousAssignedTo = currentTask.assigned_to;
    const previousStatus = currentTask.status;
    const previousAllocatedTime = currentTask.allocated_time;

    // Preserve due_date if not provided in request - use existing value from database
    let finalDueDate = due_date;
    if (finalDueDate === undefined || finalDueDate === null || finalDueDate === '') {
      finalDueDate = currentTask.due_date;
    }

    // Parse assigned_to if provided, otherwise set to null
    let newAssignedTo = null;
    if (assigned_to && assigned_to !== '' && assigned_to !== null) {
      newAssignedTo = parseInt(assigned_to);
      if (isNaN(newAssignedTo) || newAssignedTo <= 0) {
        newAssignedTo = null;
      }
    }

    // Normalize status for comparison (both previous and new)
    // Convert project-style statuses to legacy statuses for database compatibility
    let normalizedPreviousStatus = previousStatus || 'pending';
    if (normalizedPreviousStatus === 'in-progress') {
      normalizedPreviousStatus = 'in_progress';
    } else if (normalizedPreviousStatus === 'on-track') {
      normalizedPreviousStatus = 'in_progress'; // Map on-track to in_progress
    } else if (['at-risk', 'off-track', 'on-hold'].includes(normalizedPreviousStatus)) {
      normalizedPreviousStatus = 'pending'; // Map other project statuses to pending
    }

    let normalizedStatus = status || 'pending';
    if (normalizedStatus === 'in-progress') {
      normalizedStatus = 'in_progress';
    } else if (normalizedStatus === 'on-track') {
      normalizedStatus = 'in_progress'; // Map on-track to in_progress
    } else if (['at-risk', 'off-track', 'on-hold'].includes(normalizedStatus)) {
      normalizedStatus = 'pending'; // Map other project statuses to pending
    }

    const statusChanged = normalizedPreviousStatus !== normalizedStatus;

    // Preserve assigned_by - don't allow changes, keep original creator
    // assigned_by should always remain as the original task creator
    const normalizedAssignedBy = currentTask.assigned_by; // Preserve original value

    await Task.updateTask(id, { title, description, status: normalizedStatus, assigned_to: newAssignedTo, assigned_by: normalizedAssignedBy, due_date: finalDueDate, archived, custom_fields, allocated_time });

    // Log task history for changed fields
    const [userRows] = await db.query('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
    const userName = userRows.length > 0 ? userRows[0].name : 'Unknown User';
    const userEmail = userRows.length > 0 ? userRows[0].email : '';

    // Track changes for each field
    const fieldsToTrack = {
      title: { old: currentTask.title, new: title },
      description: { old: currentTask.description, new: description },
      status: { old: currentTask.status, new: normalizedStatus },
      assigned_to: { old: currentTask.assigned_to, new: newAssignedTo },
      // assigned_by is not tracked for changes since it's preserved
      due_date: { old: currentTask.due_date, new: finalDueDate },
      allocated_time: { old: currentTask.allocated_time, new: allocated_time }
    };

    for (const [field, values] of Object.entries(fieldsToTrack)) {
      if (values.old !== values.new) {
        await logTaskHistory(id, currentTask.project_id, 'update', field, values.old, values.new, title, req.user.id, userName, userEmail);
      }
    }

    // Send notification to the newly assigned employee if assignment changed (only if newAssignedTo is provided)
    if (previousAssignedTo !== newAssignedTo && newAssignedTo) {
      try {
        // Get project name for the notification message
        const [projectRows] = await db.query('SELECT name FROM projects WHERE id = ?', [currentTask.project_id]);
        const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';

        // Get assigned user name for logging
        const [userRows] = await db.query('SELECT name FROM users WHERE id = ?', [newAssignedTo]);
        const assignedUserName = userRows.length > 0 ? userRows[0].name : 'Employee';

        // Get assigner name
        const [assignerRows] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
        const assignerName = assignerRows.length > 0 ? assignerRows[0].name : 'Manager';
        const notificationMessage = `You have been assigned to task "${title}" in project "${projectName}" by ${assignerName}`;

        await Notification.createNotification(newAssignedTo, notificationMessage, 'task_assigned');
        console.log(`Task assignment notification sent to employee ${newAssignedTo} (${assignedUserName}): ${notificationMessage}`);
      } catch (notifError) {
        console.error('Error sending task assignment notification:', notifError);
        // Don't fail the request if notification creation fails
      }
    }

    // Send notification to manager if status changed and user is an employee
    if (statusChanged && req.user.role?.toLowerCase() === 'engineer' && currentTask && currentTask.assigned_to) {
      try {
        // Get employee's manager
        const [employeeRows] = await db.query('SELECT manager_id FROM users WHERE id = ?', [currentTask.assigned_to]);

        if (employeeRows.length > 0 && employeeRows[0].manager_id) {
          const managerId = employeeRows[0].manager_id;

          // Get project name and employee email
          const [projectRows] = await db.query('SELECT name FROM projects WHERE id = ?', [currentTask.project_id]);
          const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';

          const [employeeUserRows] = await db.query('SELECT name FROM users WHERE id = ?', [currentTask.assigned_to]);
          const employeeName = employeeUserRows.length > 0 ? employeeUserRows[0].name : 'Employee';

          // Format status for display
          const statusDisplay = normalizedStatus === 'in_progress' ? 'In Progress' : normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

          const notificationMessage = `Employee ${employeeName} has updated task "${title}" in project "${projectName}" to status: ${statusDisplay}`;

          await Notification.createNotification(managerId, notificationMessage, 'task_status_update');
          console.log(`Task status update notification sent to manager ${managerId}: ${notificationMessage}`);
        }
      } catch (notifError) {
        console.error('Error sending task status update notification to manager:', notifError);
        // Don't fail the request if notification creation fails
      }
    }

    // Notify head managers if task is updated by a manager
    if (req.user.role?.toLowerCase() === 'manager' && currentTask) {
      try {
        const managerId = req.user.id;
        const [projectRows] = await db.query('SELECT name, manager_id FROM projects WHERE id = ?', [currentTask.project_id]);
        const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';
        const projectManagerId = projectRows.length > 0 ? projectRows[0].manager_id : null;

        // Only notify if the manager is assigned to this project
        if (projectManagerId === managerId) {
          // Get manager name
          const [managerRows] = await db.query('SELECT name FROM users WHERE id = ?', [managerId]);
          const managerName = managerRows.length > 0 ? managerRows[0].name : 'Manager';
          let headManagerMessage = '';

          // Build notification message based on what changed
          if (previousAssignedTo !== newAssignedTo) {
            const [oldUserRows] = await db.query('SELECT name FROM users WHERE id = ?', [previousAssignedTo]);
            const [newUserRows] = await db.query('SELECT name FROM users WHERE id = ?', [newAssignedTo]);
            const oldUserName = oldUserRows.length > 0 ? oldUserRows[0].name : 'Employee';
            const newUserName = newUserRows.length > 0 ? newUserRows[0].name : 'Employee';
            headManagerMessage = `Manager ${managerName} has reassigned task "${title}" in project "${projectName}" from ${oldUserName} to ${newUserName}`;
          } else if (statusChanged) {
            const statusDisplay = normalizedStatus === 'in_progress' ? 'In Progress' : normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
            headManagerMessage = `Manager ${managerName} has updated task "${title}" in project "${projectName}" to status: ${statusDisplay}`;
          } else {
            headManagerMessage = `Manager ${managerName} has updated task "${title}" in project "${projectName}"`;
          }

          await Notification.notifyHeadManagersForManager(managerId, headManagerMessage, 'task_updated');
          console.log(`Task update notification sent to head managers for manager ${managerId}: ${headManagerMessage}`);
        }
      } catch (notifError) {
        console.error('Error sending head manager notification for task update:', notifError);
        // Don't fail the request if notification creation fails
      }
    }

    // Notify admin, manager, and head manager if task is updated by an employee
    const updaterRole = req.user.role?.toLowerCase();
    if (updaterRole === 'engineer') {
      try {
        const employeeId = req.user.id;
        const [projectRows] = await db.query('SELECT name FROM projects WHERE id = ?', [currentTask.project_id]);
        const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';
        // Get updater name
        const [updaterRows] = await db.query('SELECT name FROM users WHERE id = ?', [employeeId]);
        const updaterName = updaterRows.length > 0 ? updaterRows[0].name : 'Employee';

        // Get employee's manager_id from database
        const [employeeRows] = await db.query('SELECT manager_id FROM users WHERE id = ?', [employeeId]);
        const managerId = employeeRows.length > 0 && employeeRows[0].manager_id ? employeeRows[0].manager_id : null;

        let updateMessage = '';
        // Build notification message based on what changed
        if (previousAssignedTo !== newAssignedTo && newAssignedTo) {
          const [oldUserRows] = await db.query('SELECT name FROM users WHERE id = ?', [previousAssignedTo]);
          const [newUserRows] = await db.query('SELECT name FROM users WHERE id = ?', [newAssignedTo]);
          const oldUserName = oldUserRows.length > 0 ? oldUserRows[0].name : 'Employee';
          const newUserName = newUserRows.length > 0 ? newUserRows[0].name : 'Employee';
          updateMessage = `Employee ${updaterName} has reassigned task "${title}" in project "${projectName}" from ${oldUserName} to ${newUserName}`;
        } else if (statusChanged) {
          const statusDisplay = normalizedStatus === 'in_progress' ? 'In Progress' : normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
          updateMessage = `Employee ${updaterName} has updated task "${title}" in project "${projectName}" to status: ${statusDisplay}`;
        } else {
          updateMessage = `Employee ${updaterName} has updated task "${title}" in project "${projectName}"`;
        }

        if (updateMessage) {
          // Notify all admins
          await Notification.notifyAllAdmins(updateMessage, 'task_updated');
          console.log(`Task update notification sent to admins: ${updateMessage}`);

          // Notify employee's specific manager if they have one
          if (managerId) {
            try {
              await Notification.createNotification(managerId, updateMessage, 'task_updated');
              console.log(`Task update notification sent to employee's manager (ID: ${managerId}): ${updateMessage}`);

              // Notify head managers for this manager
              await Notification.notifyHeadManagersForManager(managerId, updateMessage, 'task_updated');
              console.log(`Task update notification sent to head managers for manager ${managerId}: ${updateMessage}`);
            } catch (managerNotifError) {
              console.error('Error sending notification to employee\'s manager:', managerNotifError);
            }
          }
        }
      } catch (notifError) {
        console.error('Error sending notifications for employee task update:', notifError);
        // Don't fail the request if notification creation fails
      }
    }

    // Notify all admins about task update (for non-employee roles)
    if (updaterRole !== 'engineer') {
      try {
        const [projectRows] = await db.query('SELECT name FROM projects WHERE id = ?', [currentTask.project_id]);
        const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';
        // Get updater name
        const [updaterRows] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
        const updaterName = updaterRows.length > 0 ? updaterRows[0].name : 'User';
        const updaterRoleDisplay = req.user.role || 'User';
        let adminMessage = '';

        // Build notification message based on what changed
        if (previousAssignedTo !== newAssignedTo && newAssignedTo) {
          const [oldUserRows] = await db.query('SELECT name FROM users WHERE id = ?', [previousAssignedTo]);
          const [newUserRows] = await db.query('SELECT name FROM users WHERE id = ?', [newAssignedTo]);
          const oldUserName = oldUserRows.length > 0 ? oldUserRows[0].name : 'Employee';
          const newUserName = newUserRows.length > 0 ? newUserRows[0].name : 'Employee';
          adminMessage = `${updaterRoleDisplay} ${updaterName} has reassigned task "${title}" in project "${projectName}" from ${oldUserName} to ${newUserName}`;
        } else if (statusChanged) {
          const statusDisplay = normalizedStatus === 'in_progress' ? 'In Progress' : normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
          adminMessage = `${updaterRoleDisplay} ${updaterName} has updated task "${title}" in project "${projectName}" to status: ${statusDisplay}`;
        } else {
          adminMessage = `${updaterRoleDisplay} ${updaterName} has updated task "${title}" in project "${projectName}"`;
        }

        await Notification.notifyAllAdmins(adminMessage, 'task_updated');
        console.log(`Admin notification sent for task update: ${adminMessage}`);
      } catch (notifError) {
        console.error('Error sending admin notification for task update:', notifError);
        // Don't fail the request if notification creation fails
      }
    }

    // Get updated task data for sync
    const updatedTask = await Task.getTaskById(id);

    // Sync to Google Sheets (non-blocking)
    // Sync to Google Sheets (non-blocking)
    if (updatedTask) {
      googleSheetsService.syncTask('update', updatedTask).catch(err => {
        console.error('Error syncing task to Google Sheets:', err);
      });
    }

    // Notify project followers
    try {
      const [projectRows] = await db.query('SELECT name FROM projects WHERE id = ?', [currentTask.project_id]);
      const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';
      const projectFollowerSubject = `Task Updated: ${title} in Project ${projectName}`;
      const projectFollowerMessage = `Task "${title}" in project "${projectName}" has been updated by ${userName || 'a user'}.`;
      await notifyProjectFollowers(currentTask.project_id, projectFollowerSubject, projectFollowerMessage, req.user.id);
    } catch (followerError) {
      console.error('Error notifying followers:', followerError);
    }

    res.json({ success: true, message: 'Task updated successfully' });
  } catch (err) {
    console.error('Error updating task:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      taskId: req.params.id,
      body: req.body
    });
    const errorMessage = err.message || 'Failed to update task';
    res.status(500).json({ message: errorMessage });
  }
}

// Delete a task
async function deleteTask(req, res) {
  try {
    const { id } = req.params;
    const userRole = req.user.role?.toLowerCase();

    // Only admin can delete tasks
    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Only admins can delete tasks.' });
    }

    // Get task details before deletion for notification and sync
    const currentTask = await Task.getTaskById(id);

    // Sync deletion to Google Sheets (non-blocking) - before actual deletion
    if (currentTask) {
      console.log(`🔄 Attempting to sync task ${currentTask.id} DELETE to Google Sheets...`);
      googleSheetsService.syncTask('delete', currentTask)
        .then(result => {
          if (result) {
            console.log(`✅ Task ${currentTask.id} deleted from Google Sheets successfully`);
          } else {
            console.error(`❌ Failed to sync task ${currentTask.id} deletion to Google Sheets`);
          }
        })
        .catch(err => {
          console.error('❌ Error syncing task deletion to Google Sheets:', err.message);
          console.error('Full error:', err);
        });
    }

    if (currentTask) {
      // Log task deletion in history before deleting
      const [userRows] = await db.query('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
      const userName = userRows.length > 0 ? userRows[0].name : 'Unknown User';
      const userEmail = userRows.length > 0 ? userRows[0].email : '';
      await logTaskHistory(id, currentTask.project_id, 'delete', null, currentTask.title, null, currentTask.title, req.user.id, userName, userEmail);
    }

    // Notify admin, manager, and head manager if task is deleted by an employee
    if (userRole === 'engineer' && currentTask) {
      try {
        const [projectRows] = await db.query('SELECT name FROM projects WHERE id = ?', [currentTask.project_id]);
        const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';
        // Get deleter name
        const [deleterRows] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
        const deleterName = deleterRows.length > 0 ? deleterRows[0].name : 'Employee';
        const deleteMessage = `Employee ${deleterName} has deleted task "${currentTask.title}" in project "${projectName}"`;

        // Notify all admins
        await Notification.notifyAllAdmins(deleteMessage, 'task_deleted');
        console.log(`Task deletion notification sent to admins: ${deleteMessage}`);

        // Notify all managers
        await Notification.notifyAllManagers(deleteMessage, 'task_deleted');
        console.log(`Task deletion notification sent to managers: ${deleteMessage}`);

        // Notify all head managers
        await Notification.notifyAllHeadManagers(deleteMessage, 'task_deleted');
        console.log(`Task deletion notification sent to head managers: ${deleteMessage}`);
      } catch (notifError) {
        console.error('Error sending notifications for employee task deletion:', notifError);
        // Don't fail the request if notification creation fails
      }
    }

    await Task.deleteTask(id);

    // Notify head managers if task is deleted by a manager
    if (userRole === 'manager' && currentTask) {
      try {
        const managerId = req.user.id;
        const [projectRows] = await db.query('SELECT name, manager_id FROM projects WHERE id = ?', [currentTask.project_id]);
        const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';
        const projectManagerId = projectRows.length > 0 ? projectRows[0].manager_id : null;

        // Only notify if the manager is assigned to this project
        if (projectManagerId === managerId) {
          // Get manager name
          const [managerRows] = await db.query('SELECT name FROM users WHERE id = ?', [managerId]);
          const managerName = managerRows.length > 0 ? managerRows[0].name : 'Manager';
          const headManagerMessage = `Manager ${managerName} has deleted task "${currentTask.title}" from project "${projectName}"`;
          await Notification.notifyHeadManagersForManager(managerId, headManagerMessage, 'task_deleted');
          console.log(`Task deletion notification sent to head managers for manager ${managerId}: ${headManagerMessage}`);
        }
      } catch (notifError) {
        console.error('Error sending head manager notification for task deletion:', notifError);
        // Don't fail the request if notification creation fails
      }
    }

    // Notify all admins about task deletion
    if (currentTask) {
      try {
        const [projectRows] = await db.query('SELECT name FROM projects WHERE id = ?', [currentTask.project_id]);
        const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';
        // Get deleter name
        const [deleterRows] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
        const deleterName = deleterRows.length > 0 ? deleterRows[0].name : 'User';
        const deleterRole = req.user.role || 'User';

        const adminMessage = `${deleterRole} ${deleterName} has deleted task "${currentTask.title}" from project "${projectName}"`;
        await Notification.notifyAllAdmins(adminMessage, 'task_deleted');
        console.log(`Admin notification sent for task deletion: ${adminMessage}`);
      } catch (notifError) {
        console.error('Error sending admin notification for task deletion:', notifError);
        // Don't fail the request if notification creation fails
      }

      // Notify project followers
      try {
        const [projectRows] = await db.query('SELECT name FROM projects WHERE id = ?', [currentTask.project_id]);
        const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';
        const projectFollowerSubject = `Task Deleted: ${currentTask.title} in Project ${projectName}`;
        const projectFollowerMessage = `Task "${currentTask.title}" in project "${projectName}" has been deleted by ${req.user.role || 'User'}.`;
        await notifyProjectFollowers(currentTask.project_id, projectFollowerSubject, projectFollowerMessage, req.user.id);
      } catch (followerError) {
        console.error('Error notifying followers:', followerError);
      }
    }

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete task' });
  }
}

// Get time tracking for a task
async function getTaskTimeTracking(req, res) {
  try {
    const { taskId } = req.params;
    const timeEntries = await Task.getTaskTimeTracking(taskId);
    res.json(timeEntries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch time tracking' });
  }
}

// Get all tasks for current employee assigned by their manager
async function getEmployeeTasks(req, res) {
  try {
    const userRole = req.user.role?.toLowerCase();
    const userId = req.user.id;

    // Only employees can access this endpoint
    if (userRole !== 'engineer') {
      return res.status(403).json({ message: 'Access denied. Only engineers can view their tasks.' });
    }

    // Get employee's manager information
    const [userRows] = await db.query(
      'SELECT manager_id FROM users WHERE id = ?',
      [userId]
    );

    let managerEmail = null;
    let managerId = null;

    if (userRows.length > 0 && userRows[0].manager_id) {
      managerId = userRows[0].manager_id;
      // Get manager's email
      const [managerRows] = await db.query(
        'SELECT email FROM users WHERE id = ?',
        [managerId]
      );

      if (managerRows.length > 0) {
        managerEmail = managerRows[0].email;
      }
    }

    // Get all tasks for this employee
    // This will return:
    // 1. Tasks assigned by manager/admin/head manager (if manager exists)
    // 2. Tasks created by employee (assigned_by IS NULL) - if assigned_to = employeeId OR employee has logged time
    // Even if employee has no manager, they should still see their own created tasks
    const tasks = await Task.getEmployeeTasks(userId, managerEmail, managerId);
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
}

// Get comments for a task
async function getTaskComments(req, res) {
  try {
    const taskId = parseInt(req.params.id);

    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }

    const [comments] = await db.query(`
      SELECT 
        tc.id,
        tc.task_id,
        tc.user_id,
        tc.comment,
        tc.created_at,
        u.email as user_email,
        u.name as user_name
      FROM task_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at DESC
    `, [taskId]);

    res.json({ success: true, comments });
  } catch (error) {
    console.error('Error fetching task comments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch task comments' });
  }
}

// Create a comment for a task
async function createTaskComment(req, res) {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user.id;
    const { comment } = req.body;

    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }

    if (!comment || typeof comment !== 'string' || comment.trim() === '') {
      return res.status(400).json({ success: false, message: 'Comment is required' });
    }

    // Verify task exists
    const [taskRows] = await db.query('SELECT id FROM tasks WHERE id = ?', [taskId]);
    if (taskRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Insert comment
    const [result] = await db.query(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
      [taskId, userId, comment.trim()]
    );

    // Get the created comment with user info
    const [newComment] = await db.query(`
      SELECT 
        tc.id,
        tc.task_id,
        tc.user_id,
        tc.comment,
        tc.created_at,
        u.email as user_email,
        u.name as user_name
      FROM task_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE tc.id = ?
    `, [result.insertId]);

    // Notify Project Followers about new task comment
    try {
      const [taskRows] = await db.query('SELECT title, project_id FROM tasks WHERE id = ?', [taskId]);
      const taskTitle = taskRows.length > 0 ? taskRows[0].title : 'a task';
      const projectId = taskRows.length > 0 ? taskRows[0].project_id : null;

      if (projectId) {
        const [projectRows] = await db.query('SELECT name FROM projects WHERE id = ?', [projectId]);
        const projectName = projectRows.length > 0 ? projectRows[0].name : 'a project';
        const [userRows] = await db.query('SELECT name FROM users WHERE id = ?', [userId]);
        const commenterName = userRows.length > 0 ? userRows[0].name : 'User';

        const followers = await projectModel.getProjectFollowers(projectId);
        const followerEmails = followers.map(f => f.email).filter(Boolean);
        const followerIds = followers.map(f => f.id);

        const notificationMessage = `New comment on task "${taskTitle}" in project "${projectName}" by ${commenterName}: "${comment.substring(0, 50)}${comment.length > 50 ? '...' : ''}"`;

        // 1. Email Notifications
        if (followerEmails.length > 0) {
          const emailSubject = `New Comment on Task: ${taskTitle}`;
          const emailHtml = `<p><strong>${commenterName}</strong> commented on task <strong>"${taskTitle}"</strong> in project <strong>"${projectName}"</strong>:</p>
                                    <blockquote>${comment}</blockquote>`;

          await emailService.sendEmail(followerEmails, emailSubject, emailHtml);
        }

        // 2. In-App Notifications
        for (const followerId of followerIds) {
          // Don't notify the commenter
          if (followerId !== userId) {
            await Notification.createNotification(followerId, notificationMessage, 'task_comment');
          }
        }
      }
    } catch (notifError) {
      console.error('Error sending notifications for task comment:', notifError);
    }

    res.status(201).json({ success: true, comment: newComment[0] });
  } catch (error) {
    console.error('Error creating task comment:', error);
    res.status(500).json({ success: false, message: 'Failed to create comment' });
  }
}

// Update a task comment (only by the comment owner)
async function updateTaskComment(req, res) {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user.id;
    const { comment } = req.body;

    if (!commentId || isNaN(commentId)) {
      return res.status(400).json({ success: false, message: 'Invalid comment ID' });
    }

    if (!comment || typeof comment !== 'string' || comment.trim() === '') {
      return res.status(400).json({ success: false, message: 'Comment is required' });
    }

    // Check if comment exists and belongs to the user
    const [commentRows] = await db.query(
      'SELECT id, user_id FROM task_comments WHERE id = ?',
      [commentId]
    );

    if (commentRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (commentRows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'You can only update your own comments' });
    }

    // Update comment
    await db.query(
      'UPDATE task_comments SET comment = ? WHERE id = ?',
      [comment.trim(), commentId]
    );

    // Get the updated comment with user info
    const [updatedComment] = await db.query(`
      SELECT 
        tc.id,
        tc.task_id,
        tc.user_id,
        tc.comment,
        tc.created_at,
        u.email as user_email,
        u.name as user_name
      FROM task_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE tc.id = ?
    `, [commentId]);

    res.json({ success: true, comment: updatedComment[0] });
  } catch (error) {
    console.error('Error updating task comment:', error);
    res.status(500).json({ success: false, message: 'Failed to update comment' });
  }
}

// Delete a task comment (only by the comment owner)
async function deleteTaskComment(req, res) {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user.id;

    if (!commentId || isNaN(commentId)) {
      return res.status(400).json({ success: false, message: 'Invalid comment ID' });
    }

    // Check if comment exists and belongs to the user
    const [commentRows] = await db.query(
      'SELECT id, user_id FROM task_comments WHERE id = ?',
      [commentId]
    );

    if (commentRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (commentRows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'You can only delete your own comments' });
    }

    // Delete comment
    await db.query('DELETE FROM task_comments WHERE id = ?', [commentId]);

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting task comment:', error);
    res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
}

module.exports = { getTasksByProject, getTaskById, createTask, updateTask, deleteTask, getTaskTimeTracking, getEmployeeTasks, getTaskComments, createTaskComment, updateTaskComment, deleteTaskComment };

