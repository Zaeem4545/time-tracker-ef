const db = require('../config/db');

// Detect available columns in `customers` table to support different schemas
let availableColumns = null;
const initColumns = (async () => {
    try {
        const dbName = process.env.DB_NAME || 'time_tracking';
        const [rows] = await db.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'customers'`,
            [dbName]
        );
        availableColumns = rows.map(r => r.COLUMN_NAME);
    } catch (e) {
        console.error('Error detecting customer columns', e);
        availableColumns = [];
    }
})();

// Get all customers
async function getAllCustomers() {
    const [rows] = await db.query('SELECT * FROM customers ORDER BY name ASC');
    // Parse custom_fields from JSON string if needed
    return rows.map(row => {
        if (row.custom_fields && typeof row.custom_fields === 'string') {
            try {
                row.custom_fields = JSON.parse(row.custom_fields);
            } catch (e) {
                console.error('Error parsing custom_fields for customer', row.id, e);
                row.custom_fields = null;
            }
        }
        return row;
    });
}

// Get customer by ID
async function getCustomerById(id) {
    const [rows] = await db.query('SELECT * FROM customers WHERE id = ?', [id]);
    if (rows[0]) {
        // Parse custom_fields from JSON string if needed
        if (rows[0].custom_fields && typeof rows[0].custom_fields === 'string') {
            try {
                rows[0].custom_fields = JSON.parse(rows[0].custom_fields);
            } catch (e) {
                console.error('Error parsing custom_fields for customer', id, e);
                rows[0].custom_fields = null;
            }
        }
    }
    return rows[0];
}

// Create a new customer
async function createCustomer(data) {
    const { name, email, phone, project_name, region, notes, custom_fields } = data;
    
    // Handle custom_fields - convert to JSON string if object
    let customFieldsJson = null;
    if (custom_fields && typeof custom_fields === 'object' && Object.keys(custom_fields).length > 0) {
        customFieldsJson = JSON.stringify(custom_fields);
    } else if (custom_fields && typeof custom_fields === 'string' && custom_fields.trim() !== '') {
        customFieldsJson = custom_fields.trim();
    }
    
    await initColumns;

    // Build dynamic insert based on available columns to avoid schema errors
    const mapping = {
        name: ['name'],
        email: ['email'],
        phone: ['phone', 'contact_number'],
        project_name: ['project_name', 'company'],
        region: ['region'],
        notes: ['notes'],
        custom_fields: ['custom_fields', 'custom_field1']
    };

    const cols = [];
    const vals = [];

    const pushIfAvailable = (fieldKey, value) => {
        const candidates = mapping[fieldKey] || [fieldKey];
        for (const col of candidates) {
            if (availableColumns.includes(col)) {
                cols.push(col);
                vals.push(value);
                return true;
            }
        }
        return false;
    };

    pushIfAvailable('name', name.trim());
    pushIfAvailable('email', email?.trim() || null);
    pushIfAvailable('phone', phone?.trim() || null);
    pushIfAvailable('project_name', project_name?.trim() || null);
    pushIfAvailable('region', region?.trim() || null);
    pushIfAvailable('notes', notes?.trim() || null);
    pushIfAvailable('custom_fields', customFieldsJson);

    if (cols.length === 0) {
        throw new Error('No writable columns available in customers table');
    }

    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT INTO customers (${cols.join(', ')}) VALUES (${placeholders})`;
    const [result] = await db.query(sql, vals);

    return { id: result.insertId, ...data };
}

// Update a customer
async function updateCustomer(id, data) {
    const { name, email, phone, project_name, region, notes, custom_fields } = data;
    
    // Handle custom_fields - convert to JSON string if object
    let customFieldsJson = null;
    if (custom_fields !== undefined) {
        if (custom_fields && typeof custom_fields === 'object' && Object.keys(custom_fields).length > 0) {
            customFieldsJson = JSON.stringify(custom_fields);
        } else if (custom_fields && typeof custom_fields === 'string' && custom_fields.trim() !== '') {
            customFieldsJson = custom_fields.trim();
        }
    }
    
    await initColumns;

    const mapping = {
        name: ['name'],
        email: ['email'],
        phone: ['phone', 'contact_number'],
        project_name: ['project_name', 'company'],
        region: ['region'],
        notes: ['notes'],
        custom_fields: ['custom_fields', 'custom_field1']
    };

    const sets = [];
    const vals = [];

    const setIfAvailable = (fieldKey, value) => {
        const candidates = mapping[fieldKey] || [fieldKey];
        for (const col of candidates) {
            if (availableColumns.includes(col)) {
                sets.push(`${col} = ?`);
                vals.push(value);
                return true;
            }
        }
        return false;
    };

    setIfAvailable('name', name.trim());
    setIfAvailable('email', email?.trim() || null);
    setIfAvailable('phone', phone?.trim() || null);
    setIfAvailable('project_name', project_name?.trim() || null);
    setIfAvailable('region', region?.trim() || null);
    setIfAvailable('notes', notes?.trim() || null);
    setIfAvailable('custom_fields', customFieldsJson);

    if (sets.length === 0) return { id, ...data };

    const sql = `UPDATE customers SET ${sets.join(', ')} WHERE id = ?`;
    vals.push(id);
    await db.query(sql, vals);

    return { id, ...data };
}

// Delete a customer
async function deleteCustomer(id) {
    await db.query('DELETE FROM customers WHERE id = ?', [id]);
}

module.exports = {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
};

