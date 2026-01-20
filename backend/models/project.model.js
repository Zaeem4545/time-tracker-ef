const db = require('../config/db');

async function getAllProjects() {
    const [rows] = await db.query('SELECT * FROM projects');
    return rows;
}

async function getAllProjectsWithFollowStatus(userId) {
    const query = `
        SELECT p.*, 
               CASE WHEN pf.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_following
        FROM projects p
        LEFT JOIN project_followers pf ON p.id = pf.project_id AND pf.user_id = ?
    `;
    const [rows] = await db.query(query, [userId]);
    return rows;
}

async function followProject(projectId, userId) {
    try {
        await db.query('INSERT INTO project_followers (project_id, user_id) VALUES (?, ?)', [projectId, userId]);
        return true;
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return true; // Already following
        throw error;
    }
}

async function unfollowProject(projectId, userId) {
    await db.query('DELETE FROM project_followers WHERE project_id = ? AND user_id = ?', [projectId, userId]);
    return true;
}

async function getProjectFollowers(projectId) {
    const [rows] = await db.query(
        'SELECT u.* FROM users u JOIN project_followers pf ON u.id = pf.user_id WHERE pf.project_id = ?',
        [projectId]
    );
    return rows;
}

async function createProject(data) {
    const { name, description, start_date, end_date } = data;
    const [result] = await db.query('INSERT INTO projects (name, description, start_date, end_date) VALUES (?, ?, ?, ?)', [name, description, start_date || null, end_date || null]);
    return result;
}

module.exports = { getAllProjects, createProject, getAllProjectsWithFollowStatus, followProject, unfollowProject, getProjectFollowers };
