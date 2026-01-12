const express = require('express');
const router = express.Router();
const { getAllUsers, updateRole, deleteUser, createUser, updateUser, updateUserInfo, updateUserPassword, notifySelectedManagers, getAllEmployees, getTeamMembers, assignEmployeeToManager, removeEmployeeFromManager, getHeadManagerTeam, updateUserProfile } = require('../controllers/users.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Routes - All CRUD operations for users
router.get('/', authMiddleware, getAllUsers);        // VIEW - Get all users
router.get('/employees', authMiddleware, getAllEmployees); // VIEW - Get all employees (manager only)
router.get('/team-members', authMiddleware, getTeamMembers); // VIEW - Get team members (manager only)
router.get('/head-manager-team', authMiddleware, getHeadManagerTeam); // VIEW - Get selected managers and their employees (head manager only)
router.post('/head-manager-team', authMiddleware, getHeadManagerTeam); // POST - Get selected managers and their employees (head manager only)
router.post('/', authMiddleware, createUser);       // CREATE - Create new user
router.post('/assign-employee', authMiddleware, assignEmployeeToManager); // POST - Assign employee to manager
router.post('/remove-employee', authMiddleware, removeEmployeeFromManager); // POST - Remove employee from manager
router.put('/:id', authMiddleware, updateUser);           // UPDATE - Update user (email, password, role) - legacy
router.put('/:id/info', authMiddleware, updateUserInfo);  // UPDATE - Update user info (email, role) without password
router.put('/profile', authMiddleware, updateUserProfile); // UPDATE - Update own profile (name, contact, picture)
router.put('/:id/password', authMiddleware, updateUserPassword); // UPDATE - Update user password only
router.put('/:id/role', authMiddleware, updateRole);      // UPDATE - Update user role (legacy)
router.delete('/:id', authMiddleware, deleteUser);  // DELETE - Delete user
router.post('/notify-selected', authMiddleware, notifySelectedManagers); // POST - Notify selected managers

module.exports = router;
