const express = require('express');
const router = express.Router();
const { getAllProjects, createProject, updateProject, deleteProject, assignManagerToProject, selectProject, getSelectedProjects, getProjectComments, createProjectComment, updateProjectComment, deleteProjectComment } = require('../controllers/projects.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, getAllProjects);
router.get('/selected', authMiddleware, getSelectedProjects);
router.post('/', authMiddleware, createProject);
router.put('/:id', authMiddleware, updateProject);
router.put('/:id/assign-manager', authMiddleware, assignManagerToProject);
router.put('/:id/select', authMiddleware, selectProject);
router.delete('/:id', authMiddleware, deleteProject);

// Comments routes
router.get('/:id/comments', authMiddleware, getProjectComments);
router.post('/:id/comments', authMiddleware, createProjectComment);
router.put('/:id/comments/:commentId', authMiddleware, updateProjectComment);
router.delete('/:id/comments/:commentId', authMiddleware, deleteProjectComment);

module.exports = router;
