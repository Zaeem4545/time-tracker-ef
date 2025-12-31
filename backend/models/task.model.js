const db = require('../config/db');

// Helper function to normalize date - extract YYYY-MM-DD from ISO datetime strings
function normalizeDate(dateValue) {
    if (!dateValue || dateValue === '' || dateValue === null) {
        return null;
    }
    
    // If it's already in YYYY-MM-DD format, return as is
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
    }
    
    // If it's an ISO datetime string (e.g., '2025-12-16T19:00:00.000Z'), extract date part
    if (typeof dateValue === 'string' && dateValue.includes('T')) {
        return dateValue.split('T')[0];
    }
    
    // If it's a datetime string with space separator, extract date part
    if (typeof dateValue === 'string' && dateValue.includes(' ')) {
        return dateValue.split(' ')[0];
    }
    
    // Try to parse as Date and extract YYYY-MM-DD
    try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    } catch (e) {
        // If parsing fails, return null
    }
    
    return null;
}

async function getTasksByProject(projectId) {
    const [rows] = await db.query(
        'SELECT t.*, u.email as assigned_to_email FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.project_id = ? ORDER BY t.id DESC',
        [projectId]
    );
    return rows;
}

// Get tasks for a specific project assigned to an employee by their manager
async function getEmployeeTasksByProject(projectId, employeeId, managerEmail, managerId) {
    let query = `
        SELECT t.*, 
               u.email as assigned_to_email
        FROM tasks t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.project_id = ? AND t.assigned_to = ?
    `;
    const params = [projectId, employeeId];
    
    // Filter by manager - check both assigned_by email AND project manager_id
    // This handles cases where assigned_by might be null but project is assigned to manager
    if (managerEmail && managerId) {
        query += ` AND (t.assigned_by = ? OR p.manager_id = ?)`;
        params.push(managerEmail, managerId);
    } else if (managerEmail) {
        query += ' AND t.assigned_by = ?';
        params.push(managerEmail);
    } else if (managerId) {
        query += ' AND p.manager_id = ?';
        params.push(managerId);
    }
    
    query += ' ORDER BY t.id DESC';
    
    const [rows] = await db.query(query, params);
    return rows;
}

async function getTaskById(id) {
    const [rows] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
    return rows[0];
}

// Get all tasks for an employee assigned by their manager
async function getEmployeeTasks(employeeId, managerEmail, managerId) {
    // Get tasks where:
    // 1. Task is assigned to employee by manager/admin/head manager (assigned_to = employeeId AND assigned_by IS NOT NULL)
    // 2. Task is created by employee (assigned_by IS NULL) - show if employee has logged time for that specific task OR task is assigned to them
    // This ensures employees see their own created tasks immediately, even if not assigned
    let query = `
        SELECT DISTINCT t.*, 
               u.email as assigned_to_email,
               p.name as project_name
        FROM tasks t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE (
            -- Tasks assigned to employee by manager/admin/head manager
            (t.assigned_to = ? AND t.assigned_by IS NOT NULL)
            OR
            -- Tasks created by employee (assigned_by IS NULL)
            -- Show if employee has logged time for THIS SPECIFIC task OR task is assigned to them
            -- This ensures employees see tasks they created, even if not assigned to themselves
            (t.assigned_by IS NULL AND (
                EXISTS (
                    SELECT 1 FROM time_entries te 
                    WHERE te.user_id = ? 
                    AND te.project_id = t.project_id 
                    AND te.task_name = t.title
                )
                OR
                t.assigned_to = ?
            ))
        )
    `;
    const params = [employeeId, employeeId, employeeId];
    
    // Filter by manager assignment for tasks assigned by manager
    if (managerEmail && managerId) {
        query += ` AND (
            -- Task assigned by manager/admin/head manager
            (t.assigned_to = ? AND t.assigned_by IS NOT NULL AND (t.assigned_by = ? OR p.manager_id = ?))
            OR
            -- Task created by employee (assigned_by IS NULL) - show if employee has logged time for it or assigned to them
            (t.assigned_by IS NULL AND (
                EXISTS (
                    SELECT 1 FROM time_entries te 
                    WHERE te.user_id = ? 
                    AND te.project_id = t.project_id 
                    AND te.task_name = t.title
                )
                OR
                t.assigned_to = ?
            ))
        )`;
        params.push(employeeId, managerEmail, managerId, employeeId, employeeId);
    } else if (managerEmail) {
        query += ` AND (
            -- Task assigned by manager
            (t.assigned_to = ? AND t.assigned_by IS NOT NULL AND t.assigned_by = ?)
            OR
            -- Task created by employee (assigned_by IS NULL) - show if employee has logged time for it or assigned to them
            (t.assigned_by IS NULL AND (
                EXISTS (
                    SELECT 1 FROM time_entries te 
                    WHERE te.user_id = ? 
                    AND te.project_id = t.project_id 
                    AND te.task_name = t.title
                )
                OR
                t.assigned_to = ?
            ))
        )`;
        params.push(employeeId, managerEmail, employeeId, employeeId);
    } else if (managerId) {
        query += ` AND (
            -- Task assigned by manager
            (t.assigned_to = ? AND t.assigned_by IS NOT NULL AND p.manager_id = ?)
            OR
            -- Task created by employee (assigned_by IS NULL) - show if employee has logged time for it or assigned to them
            (t.assigned_by IS NULL AND (
                EXISTS (
                    SELECT 1 FROM time_entries te 
                    WHERE te.user_id = ? 
                    AND te.project_id = t.project_id 
                    AND te.task_name = t.title
                )
                OR
                t.assigned_to = ?
            ))
        )`;
        params.push(employeeId, managerId, employeeId, employeeId);
    }
    // If no manager, still show employee-created tasks (already handled in WHERE clause)
    
    query += ' ORDER BY t.id DESC';
    
    const [rows] = await db.query(query, params);
    return rows;
}

async function createTask(data) {
    const { project_id, title, description, status = 'pending', assigned_to, assigned_by, due_date, custom_fields, allocated_time } = data;
    
    // Normalize values - convert empty strings to null
    const normalizedAssignedTo = (assigned_to && assigned_to !== '' && assigned_to !== '0') ? parseInt(assigned_to) : null;
    const normalizedAssignedBy = (assigned_by && assigned_by.trim() !== '') ? assigned_by.trim() : null;
    const normalizedDueDate = normalizeDate(due_date);
    const normalizedDescription = (description && description.trim() !== '') ? description.trim() : null;
    const normalizedAllocatedTime = (allocated_time && allocated_time.trim() !== '') ? allocated_time.trim() : null;
    
    // Normalize status - convert "in-progress" to "in_progress" or ensure it's a valid value
    let normalizedStatus = status || 'pending';
    if (normalizedStatus === 'in-progress') {
        normalizedStatus = 'in_progress';
    } else if (!['pending', 'in_progress', 'completed'].includes(normalizedStatus)) {
        normalizedStatus = 'pending'; // Default to pending if invalid
    }
    
    // Handle custom_fields - convert to JSON string if object
    let normalizedCustomFields = null;
    if (custom_fields && typeof custom_fields === 'object' && Object.keys(custom_fields).length > 0) {
        normalizedCustomFields = JSON.stringify(custom_fields);
    } else if (custom_fields && typeof custom_fields === 'string' && custom_fields.trim() !== '') {
        normalizedCustomFields = custom_fields.trim();
    }
    
    console.log('Creating task with normalized data:', {
        project_id,
        title,
        description: normalizedDescription,
        status: normalizedStatus,
        assigned_to: normalizedAssignedTo,
        assigned_by: normalizedAssignedBy,
        due_date: normalizedDueDate,
        allocated_time: normalizedAllocatedTime,
        custom_fields: normalizedCustomFields
    });
    
    const [result] = await db.query(
        'INSERT INTO tasks (project_id, title, description, status, assigned_to, assigned_by, due_date, allocated_time, custom_fields) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [project_id, title, normalizedDescription, normalizedStatus, normalizedAssignedTo, normalizedAssignedBy, normalizedDueDate, normalizedAllocatedTime, normalizedCustomFields]
    );
    return { id: result.insertId, project_id, title, description: normalizedDescription, status: normalizedStatus, assigned_to: normalizedAssignedTo, assigned_by: normalizedAssignedBy, due_date: normalizedDueDate, allocated_time: normalizedAllocatedTime, custom_fields: normalizedCustomFields };
}

async function updateTask(id, data) {
    const { title, description, status, assigned_to, assigned_by, due_date, archived, custom_fields, allocated_time } = data;
    
    // Normalize assigned_by - keep as string or null
    const normalizedAssignedBy = (assigned_by && assigned_by.trim() !== '') ? assigned_by.trim() : null;
    
    // Normalize due_date - extract date part from ISO datetime strings
    const normalizedDueDate = normalizeDate(due_date);
    
    // Normalize allocated_time
    const normalizedAllocatedTime = (allocated_time !== undefined && allocated_time !== null && allocated_time !== '') 
        ? (typeof allocated_time === 'string' ? allocated_time.trim() : allocated_time) 
        : null;
    if (normalizedAllocatedTime === '') {
        normalizedAllocatedTime = null;
    }
    
    // Normalize status - convert "in-progress" to "in_progress" or ensure it's a valid value
    let normalizedStatus = status || 'pending';
    if (normalizedStatus === 'in-progress') {
        normalizedStatus = 'in_progress';
    } else if (!['pending', 'in_progress', 'completed'].includes(normalizedStatus)) {
        normalizedStatus = 'pending'; // Default to pending if invalid
    }
    
    // Handle custom_fields - convert to JSON string if object
    let normalizedCustomFields = null;
    if (custom_fields !== undefined) {
        if (custom_fields && typeof custom_fields === 'object' && Object.keys(custom_fields).length > 0) {
            normalizedCustomFields = JSON.stringify(custom_fields);
        } else if (custom_fields && typeof custom_fields === 'string' && custom_fields.trim() !== '') {
            normalizedCustomFields = custom_fields.trim();
        } else {
            normalizedCustomFields = null;
        }
    }
    
    // Ensure required fields are not null/undefined
    if (!title || title.trim() === '') {
        throw new Error('Task title is required');
    }
    
    const updateFields = ['title', 'description', 'status', 'assigned_to', 'assigned_by', 'due_date'];
    const updateValues = [
        title.trim(), 
        (description && description.trim() !== '') ? description.trim() : null, 
        normalizedStatus, 
        assigned_to || null, 
        normalizedAssignedBy, 
        normalizedDueDate
    ];
    
    if (archived !== undefined) {
        updateFields.push('archived');
        updateValues.push(archived ? 1 : 0); // Convert boolean to TINYINT
    }
    
    if (allocated_time !== undefined) {
        updateFields.push('allocated_time');
        updateValues.push(normalizedAllocatedTime);
    }
    
    if (custom_fields !== undefined) {
        updateFields.push('custom_fields');
        updateValues.push(normalizedCustomFields);
    }
    
    updateValues.push(id);
    const updateQuery = `UPDATE tasks SET ${updateFields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
    await db.query(updateQuery, updateValues);
}

async function deleteTask(id) {
    await db.query('DELETE FROM tasks WHERE id = ?', [id]);
}

async function getTaskTimeTracking(taskId) {
    // First get the task to get its title
    const task = await getTaskById(taskId);
    if (!task) {
        return [];
    }
    
    // Query time_entries by task_name (matching task title)
    const [rows] = await db.query(
        `SELECT te.*, u.email as user_email 
         FROM time_entries te 
         JOIN users u ON te.user_id = u.id 
         WHERE te.task_name = ? 
         ORDER BY te.start_time DESC`,
        [task.title]
    );
    return rows;
}

module.exports = { getTasksByProject, getTaskById, createTask, updateTask, deleteTask, getTaskTimeTracking, getEmployeeTasks, getEmployeeTasksByProject };

