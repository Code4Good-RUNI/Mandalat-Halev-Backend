const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { getContactByIdAndEmail } = require('./salesforce-helper');
require('dotenv').config();

const router = express.Router();

// In-memory store for demo (use Redis/DB in production)
const codeStore = {};

// Nodemailer setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// 1. Request code endpoint
router.post('/request-code', async (req, res) => {
  const { userId, email } = req.body;
  if (!userId || !email) return res.status(400).json({ error: 'Missing userId or email' });

  // Check with Salesforce
  const contact = await getContactByIdAndEmail(userId, email);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  // Generate code and store
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  codeStore[`${userId}:${email}`] = { code, expires: Date.now() + 5 * 60 * 1000 };

  // Send Email
//   await transporter.sendMail({
//     from: process.env.SMTP_FROM,
//     to: email,
//     subject: 'Your Authentication Code',
//     text: `Your authentication code is: ${code}`
//   });

// output the code to console instead of sending email
  console.log(`Your authentication code is: ${code}`);

  res.json({ message: 'Code sent' });
});

// 2. Verify code endpoint
router.post('/verify-code', (req, res) => {
  const { userId, email, code } = req.body;
  const key = `${userId}:${email}`;
  const entry = codeStore[key];
  if (!entry || entry.code !== code || Date.now() > entry.expires) {
    return res.status(401).json({ error: 'Invalid or expired code' });
  }
  delete codeStore[key];
  // Issue JWT
  const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

module.exports = router;