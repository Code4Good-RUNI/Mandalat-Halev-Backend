// routes/salesforce.js

const express = require('express');
const { withSalesforceRetry } = require('../utils/salesforceRetry');

const router = express.Router();

router.get('/contacts', async (req, res) => {
  try {
    const result = await withSalesforceRetry(async (conn) => {
      return await conn.query('SELECT Id, FirstName, LastName FROM Contact LIMIT 10');
    });
    res.json(result.records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
