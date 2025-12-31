const express = require('express');
const router = express.Router();
const { getTimeEntries, startTime, stopTime, getActiveTimeEntry, updateTimeEntry, deleteTimeEntry, clearAllTimeEntries, createTimeEntry } = require('../controllers/time.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, getTimeEntries);
router.get('/active', authMiddleware, getActiveTimeEntry);
router.post('/start', authMiddleware, startTime);
router.post('/stop/:id', authMiddleware, stopTime);
router.post('/', authMiddleware, createTimeEntry);
router.put('/:id', authMiddleware, updateTimeEntry);
router.delete('/:id', authMiddleware, deleteTimeEntry);
router.delete('/', authMiddleware, clearAllTimeEntries);

module.exports = router;
