const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
require('dotenv').config();

const client = new OAuth2Client('1056314389224-cm5hq01s9ncfq0n1rqpvrse0mr8ojkc5.apps.googleusercontent.com');

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user has no password yet (e.g., created via Google), set it now
    if (!user.password) {
      const hash = await bcrypt.hash(password, 10);
      await User.updatePassword(user.id, hash);
      user.password = hash;
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );

    // Send response consistent with Google login
    res.json({
      token,
      role: user.role,
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
}

async function googleLogin(req, res) {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Google ID token required' });

    const ticket = await client.verifyIdToken({
      idToken,
      audience: '1056314389224-cm5hq01s9ncfq0n1rqpvrse0mr8ojkc5.apps.googleusercontent.com'
    });

    const email = ticket.getPayload().email;

    // Find existing user or create new
    let user = await User.findByEmail(email);
    if (!user) {
      user = await User.create({ email, role: 'Engineer' });
    }


    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );

    // Send response compatible with frontend
    res.json({
      token,
      role: user.role,
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Google login failed' });
  }
}

module.exports = { login, googleLogin };
