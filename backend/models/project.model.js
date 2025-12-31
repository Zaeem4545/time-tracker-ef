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

module.exports = { getAllProjects, createProject };
