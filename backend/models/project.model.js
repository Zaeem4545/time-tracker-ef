const db = require('../config/db');

async function getAllProjects() {
    const [rows] = await db.query('SELECT * FROM projects');
    return rows;
}

async function createProject(data) {
    const { name, description, start_date, end_date } = data;
    const [result] = await db.query('INSERT INTO projects (name, description, start_date, end_date) VALUES (?, ?, ?, ?)', [name, description, start_date || null, end_date || null]);
    return result;
}


async function getProjectFollowers(projectId) {
    const [rows] = await db.query(
        `SELECT u.id, u.email, u.name 
         FROM project_followers pf 
         JOIN users u ON pf.user_id = u.id 
         WHERE pf.project_id = ?`,
        [projectId]
    );
    return rows;
}

async function addFollower(projectId, userId) {
    try {
        await db.query(
            'INSERT INTO project_followers (project_id, user_id) VALUES (?, ?)',
            [projectId, userId]
        );
        return true;
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return false; // Already following
        }
        throw error;
    }
}

async function removeFollower(projectId, userId) {
    await db.query(
        'DELETE FROM project_followers WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
    );
}

async function isFollowing(projectId, userId) {
    const [rows] = await db.query(
        'SELECT 1 FROM project_followers WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
    );
    return rows.length > 0;
}

module.exports = { getAllProjects, createProject, getProjectFollowers, addFollower, removeFollower, isFollowing };
