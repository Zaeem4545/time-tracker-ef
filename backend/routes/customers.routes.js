const express = require('express');
const router = express.Router();
const { getAllCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } = require('../controllers/customers.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, getAllCustomers);
router.get('/:id', authMiddleware, getCustomerById);
router.post('/', authMiddleware, createCustomer);
router.put('/:id', authMiddleware, updateCustomer);
router.delete('/:id', authMiddleware, deleteCustomer);

module.exports = router;

