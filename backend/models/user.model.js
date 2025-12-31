const db = require('../config/db');

async function findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
}

async function getAll() {
    const [rows] = await db.query('SELECT * FROM users');
    return rows;
}

async function updateRole(id, role) {
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
}

// ✅ Add create method (for Google users; password can be NULL)
async function create({ email, role = 'Employee' }) {
    const [result] = await db.query(
        'INSERT INTO users (email, role) VALUES (?, ?)',
        [email, role]
    );
    return {
        id: result.insertId,
        email,
        role
    };
}

async function updatePassword(id, passwordHash) {
    await db.query('UPDATE users SET password = ? WHERE id = ?', [passwordHash, id]);
}

module.exports = { findByEmail, getAll, updateRole, create, updatePassword };
