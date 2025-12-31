const express = require('express');
const router = express.Router();
const { getTasksByProject, getTaskById, createTask, updateTask, deleteTask, getTaskTimeTracking, getEmployeeTasks, getTaskComments, createTaskComment, updateTaskComment, deleteTaskComment } = require('../controllers/tasks.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/employee/my-tasks', authMiddleware, getEmployeeTasks);
router.get('/project/:projectId', authMiddleware, getTasksByProject);
router.get('/:id', authMiddleware, getTaskById);
router.get('/:taskId/time-tracking', authMiddleware, getTaskTimeTracking);
router.post('/', authMiddleware, createTask);
router.put('/:id', authMiddleware, updateTask);
router.delete('/:id', authMiddleware, deleteTask);

// Comments routes
router.get('/:id/comments', authMiddleware, getTaskComments);
router.post('/:id/comments', authMiddleware, createTaskComment);
router.put('/:id/comments/:commentId', authMiddleware, updateTaskComment);
router.delete('/:id/comments/:commentId', authMiddleware, deleteTaskComment);

module.exports = router;

