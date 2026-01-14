const Customer = require('../models/customer.model');
const googleSheetsService = require('../services/googleSheets.service');

// Get all customers
async function getAllCustomers(req, res) {
  try {
    const customers = await Customer.getAllCustomers();
    res.json(customers);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
}

// Get customer by ID
async function getCustomerById(req, res) {
  try {
    const { id } = req.params;
    const customer = await Customer.getCustomerById(id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ message: 'Failed to fetch customer' });
  }
}

// Create a new customer
async function createCustomer(req, res) {
  try {
    const { name, email, phone, project_name, region, notes, custom_fields } = req.body;
    
    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Customer name is required' });
    }
    
    const customer = await Customer.createCustomer({
      name,
      email,
      phone,
      project_name,
      region,
      notes,
      custom_fields
    });
    
    // Sync to Google Sheets (non-blocking)
    googleSheetsService.syncCustomer('create', customer).catch(err => {
      console.error('Error syncing customer to Google Sheets:', err);
    });

    res.status(201).json({ success: true, message: 'Customer created successfully', customer });
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ message: 'Failed to create customer' });
  }
}

// Update a customer
async function updateCustomer(req, res) {
  try {
    const { id } = req.params;
    const { name, email, phone, project_name, region, notes, custom_fields } = req.body;
    
    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Customer name is required' });
    }
    
    // Check if customer exists
    const existingCustomer = await Customer.getCustomerById(id);
    if (!existingCustomer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    // Check if region has changed
    const regionChanged = existingCustomer.region !== region;
    const newRegion = region ? region.trim() : null;
    
    await Customer.updateCustomer(id, {
      name,
      email,
      phone,
      project_name,
      region,
      notes,
      custom_fields
    });
    
    // Update region in all projects associated with this customer
    if (regionChanged) {
      try {
        const db = require('../config/db');
        await db.query('UPDATE projects SET region = ? WHERE customer_id = ?', [newRegion, id]);
        console.log(`Updated region in all projects for customer ${id} to "${newRegion}"`);
      } catch (projectUpdateError) {
        console.error('Error updating projects region:', projectUpdateError);
        // Don't fail the customer update if project update fails
      }
    }
    
    // Get updated customer data for sync
    const updatedCustomer = await Customer.getCustomerById(id);
    
    // Sync to Google Sheets (non-blocking)
    if (updatedCustomer) {
      googleSheetsService.syncCustomer('update', updatedCustomer).catch(err => {
        console.error('Error syncing customer to Google Sheets:', err);
      });
    }

    res.json({ success: true, message: 'Customer updated successfully' });
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ message: 'Failed to update customer' });
  }
}

// Delete a customer
async function deleteCustomer(req, res) {
  try {
    // Only admin can delete customers
    if (req.user.role?.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Only admins can delete customers.' });
    }

    const { id } = req.params;
    
    // Check if customer exists
    const existingCustomer = await Customer.getCustomerById(id);
    if (!existingCustomer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    // Sync deletion to Google Sheets (non-blocking) - before actual deletion
    console.log(`🔄 Attempting to sync customer ${existingCustomer.id} DELETE to Google Sheets...`);
    googleSheetsService.syncCustomer('delete', existingCustomer)
      .then(result => {
        if (result) {
          console.log(`✅ Customer ${existingCustomer.id} deleted from Google Sheets successfully`);
        } else {
          console.error(`❌ Failed to sync customer ${existingCustomer.id} deletion to Google Sheets`);
        }
      })
      .catch(err => {
        console.error('❌ Error syncing customer deletion to Google Sheets:', err.message);
        console.error('Full error:', err);
      });
    
    await Customer.deleteCustomer(id);
    
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ message: 'Failed to delete customer' });
  }
}

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};

