const express = require('express');
const auth_check = require('../../middleware/auth_check'); // your renamed middleware
const salesforce_session = require('../../salesforce-session');
const jsforce = require('jsforce');

const router = express.Router();

/**
 * GET /user/details
 * Returns the authenticated user's Salesforce details
 */
router.get('/', auth_check, async (req, res) => {
  try {
    const { userId, email } = req.user; // decoded from JWT

    if (!salesforce_session.accessToken || !salesforce_session.instanceUrl) {
      return res.status(401).json({ error: 'Not authenticated with Salesforce' });
    }

    const conn = new jsforce.Connection({
      accessToken: salesforce_session.accessToken,
      instanceUrl: salesforce_session.instanceUrl
    });

    // Fetch the Contact record for this user
    const result = await conn.query(
      `SELECT Id, FirstName, LastName, Email, Phone 
       FROM Contact 
       WHERE Id = '${userId}' AND Email = '${email}' 
       LIMIT 1`
    );

    if (!result.records || result.records.length === 0) {
      return res.status(404).json({ error: 'User not found in Salesforce' });
    }

    res.json({
      user: req.user,       // JWT payload (userId, email, etc.)
      salesforce: result.records[0] // Salesforce contact record
    });
  } catch (err) {
    console.error('Error in getUserDetails:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
