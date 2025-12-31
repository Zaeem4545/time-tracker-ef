const express = require('express');
const router = express.Router();
const { uploadFile, getFile } = require('../controllers/upload.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/', authMiddleware, uploadFile);
router.get('/:filename', getFile);

module.exports = router;

