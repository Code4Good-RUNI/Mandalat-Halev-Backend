const express = require('express');
const salesforce_session = require('../../salesforce-session');

const router = express.Router();

// GET /salesforce/status
router.get('/status', (req, res) => {
  const accessToken = salesforce_session.accessToken || null;
  const instanceUrl = salesforce_session.instanceUrl || null;
  const mock = String(process.env.MOCK_SF || 'false').toLowerCase() === 'true';

  res.json({
    ok: true,
    connected: Boolean(accessToken && instanceUrl),
    instanceUrl,
    mock
  });
});

module.exports = router;
