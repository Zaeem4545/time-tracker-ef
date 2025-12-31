const db = require('../config/db');

// Get project history (includes project updates and task changes)
async function getProjectHistory(req, res) {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Verify project exists
    const [projectRows] = await db.query('SELECT id, name FROM projects WHERE id = ?', [projectId]);
    if (projectRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Get project history
    const [projectHistory] = await db.query(`
      SELECT 
        ph.id,
        ph.project_id,
        ph.action,
        ph.field_name,
        ph.old_value,
        ph.new_value,
        ph.changed_by,
        ph.changed_by_name,
        ph.changed_by_email,
        ph.changed_at,
        'project' as type
      FROM project_history ph
      WHERE ph.project_id = ?
      ORDER BY ph.changed_at DESC
    `, [projectId]);

    // Get task history for this project
    const [taskHistory] = await db.query(`
      SELECT 
        th.id,
        th.task_id,
        th.project_id,
        th.action,
        th.field_name,
        th.old_value,
        th.new_value,
        th.task_title,
        th.changed_by,
        th.changed_by_name,
        th.changed_by_email,
        th.changed_at,
        'task' as type
      FROM task_history th
      WHERE th.project_id = ?
      ORDER BY th.changed_at DESC
    `, [projectId]);

    // Combine and sort by date
    const allHistory = [...projectHistory, ...taskHistory].sort((a, b) => 
      new Date(b.changed_at) - new Date(a.changed_at)
    );

    res.json({ 
      success: true, 
      history: allHistory,
      project: projectRows[0]
    });
  } catch (error) {
    console.error('Error fetching project history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project history' });
  }
}

// Get task history for a specific task
async function getTaskHistory(req, res) {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    // Verify task exists
    const [taskRows] = await db.query('SELECT id, title, project_id FROM tasks WHERE id = ?', [taskId]);
    if (taskRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const task = taskRows[0];

    // Get task history for this specific task
    const [taskHistory] = await db.query(`
      SELECT 
        th.id,
        th.task_id,
        th.project_id,
        th.action,
        th.field_name,
        th.old_value,
        th.new_value,
        th.task_title,
        th.changed_by,
        th.changed_by_name,
        th.changed_by_email,
        th.changed_at,
        'task' as type
      FROM task_history th
      WHERE th.task_id = ?
      ORDER BY th.changed_at DESC
    `, [taskId]);

    res.json({ 
      success: true, 
      history: taskHistory,
      task: task
    });
  } catch (error) {
    console.error('Error fetching task history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch task history' });
  }
}

module.exports = {
  getProjectHistory,
  getTaskHistory
};

