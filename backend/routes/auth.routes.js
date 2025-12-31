const express = require('express');
const { login, googleLogin } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', login);          // ✅ login function must exist
router.post('/google', googleLogin);   // ✅ googleLogin function must exist

module.exports = router;
