const db = require('../config/db');

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
    
    const [result] = await db.query(
        'INSERT INTO customers (name, email, phone, project_name, region, notes, custom_fields) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
            name.trim(),
            email?.trim() || null,
            phone?.trim() || null,
            project_name?.trim() || null,
            region?.trim() || null,
            notes?.trim() || null,
            customFieldsJson
        ]
    );
    
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
    
    await db.query(
        'UPDATE customers SET name = ?, email = ?, phone = ?, project_name = ?, region = ?, notes = ?, custom_fields = ? WHERE id = ?',
        [
            name.trim(),
            email?.trim() || null,
            phone?.trim() || null,
            project_name?.trim() || null,
            region?.trim() || null,
            notes?.trim() || null,
            customFieldsJson,
            id
        ]
    );
    
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

