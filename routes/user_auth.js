const express = require('express');
const jwt = require('jsonwebtoken');
const { getContactByIdAndEmail } = require('../utils/salesforce-helper');
const authenticate = require('../middleware/auth_check'); 
const salesforce_session = require('../salesforce-session');
const jsforce = require('jsforce');


require('dotenv').config();

const router = express.Router();

// In-memory store for demo (use Redis/DB in production)
const codeStore = {};

// JWT secret (use environment variable in production)
// For development, you can set this in a .env file or use a hardcoded value
// Make sure to change this in production!
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// 1. Request code endpoint
router.post('/request-code', async (req, res) => {
    console.log('Requesting code with body:', req.body);
    const { userId, email } = req.body;
    if (!userId || !email) return res.status(400).json({ error: 'Missing userId or email' });

    // Check with Salesforce
    const contact = await getContactByIdAndEmail(userId, email);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    console.log('Contact found:', contact);

    // Generate code and store
    console.log(`Generating code for userId: ${userId}, email: ${email}`);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    codeStore[`${userId}:${email}`] = { code, expires: Date.now() + 5 * 60 * 1000 };

    // TODO: Send code via SMS or email

    // output the code to console instead of sending SMS
    console.log(`Your authentication code is: ${code}, saving to process.env.code`);
    process.env.code = code;
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


// Middleware to authenticate JWT
router.get('/protected-contacts', authenticate, async (req, res) => {
    const { accessToken, instanceUrl } = salesforce_session;
    
    if (!accessToken || !instanceUrl) {
        return res.status(401).json({ error: 'Not authenticated with Salesforce' });
    }

    const conn = new jsforce.Connection({
        accessToken,
        instanceUrl
    });

    try {
        const result = await conn.query(`
            SELECT Id, FirstName, LastName, Email 
            FROM Contact 
            LIMIT 10
        `);
        res.json({
            user: req.user,  // This contains the decoded JWT payload
            contacts: result.records
        });
    } catch (err) {
        console.error('Error fetching protected contacts:', err);
        res.status(500).json({ error: err.message });
    }
});


// Add this to your routes/auth.js or create a new test route

router.get('/test-salesforce', async (req, res) => {
    try {
        const { withSalesforceRetry } = require('../utils/salesforceRetry');
        
        const result = await withSalesforceRetry(async (conn) => {
            // Simple query to test connection
            const queryResult = await conn.query('SELECT COUNT() FROM Contact LIMIT 1');
            return {
                connected: true,
                contactCount: queryResult.totalSize,
                instanceUrl: conn.instanceUrl
            };
        });
        
        res.json({
            status: 'success',
            message: 'Salesforce connection is working',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Salesforce connection failed',
            error: error.message
        });
    }
});

module.exports = router;

