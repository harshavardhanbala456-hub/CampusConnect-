// backend/routes/auth.js — Register, Login, Me (Supabase integration)
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Helper: sign a JWT for a user row
function signToken(user) {
  return jwt.sign(
    {
      id:         user.id,
      email:      user.email,
      name:       user.name,
      role:       user.role,
      department: user.department,
      year:       user.year,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ─── POST /api/auth/register ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, department, year } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role are required.' });
    }

    const supabase = await getDb();

    // Check duplicate email
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();

    const { error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id,
          name,
          email,
          password_hash,
          role: role === 'admin' ? 'admin' : 'student',
          department: department || null,
          year: year || null,
        }
      ]);

    if (insertError) {
      throw insertError;
    }

    // Fetch the newly created user
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    const token = signToken(user);
    const safeUser = { ...user };
    delete safeUser.password_hash;

    return res.status(201).json({ token, user: safeUser });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const supabase = await getDb();
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!user || error) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    const { password_hash, ...safeUser } = user;
    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const supabase = await getDb();
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, department, year, created_at')
      .eq('id', req.user.id)
      .maybeSingle();

    if (!user || error) return res.status(404).json({ error: 'User not found.' });
    
    return res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
