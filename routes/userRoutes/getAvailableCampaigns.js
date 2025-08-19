const express = require('express');
const auth_check = require('../../middleware/auth_check');
const salesforce_session = require('../../salesforce-session');
const jsforce = require('jsforce');
const { fetchObjectMetadata } = require('../../utils/metadata');

const router = express.Router();

/**
 * @route GET /user/campaigns
 * @desc Return all available campaigns + Salesforce Campaign metadata
 * @access Protected (JWT required)
 */
router.get('/', auth_check, async (req, res) => {
  try {
    if (!salesforce_session.accessToken || !salesforce_session.instanceUrl) {
      return res.status(401).json({ error: 'Not authenticated with Salesforce' });
    }

    const conn = new jsforce.Connection({
      accessToken: salesforce_session.accessToken,
      instanceUrl: salesforce_session.instanceUrl
    });

    console.log('[getAvailableCampaigns] Fetching campaigns...');

    // Query all Campaigns first (no filters applied yet)
    const query = `
      SELECT Id, Name, Status, StartDate, EndDate, IsActive,
             Description, NumberOfContacts, min_participants__c, max_participants__c
      FROM Campaign
      ORDER BY StartDate DESC
      LIMIT 100
    `;

    const result = await conn.query(query);

    if (!result.records || result.records.length === 0) {
      return res.status(404).json({ error: 'No campaigns found in Salesforce' });
    }

    // Get Campaign object metadata
    const fields = await fetchObjectMetadata(conn, 'Campaign');

    res.json({
      campaigns: result.records,
      campaignFields: fields
    });

  } catch (err) {
    console.error('❌ Error in /user/campaigns:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
