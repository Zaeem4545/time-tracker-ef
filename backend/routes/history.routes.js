const express = require('express');
const router = express.Router();
const { getProjectHistory, getTaskHistory } = require('../controllers/history.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/project/:projectId', authMiddleware, getProjectHistory);
router.get('/task/:taskId', authMiddleware, getTaskHistory);

module.exports = router;

