/**
 * Retrieve contacts from Salesforce
 * 
 * This endpoint demonstrates how to use the access token to make API requests to Salesforce.
 * It retrieves a list of contacts with basic information.
 * 
 * @route GET /contacts
 * @returns {Object[]} Array of contact records
 * @throws {401} If not authenticated with Salesforce
 * @throws {500} If there's an error fetching contacts
 */
router.get('/contactsExample', async (req, res) => {
    const { accessToken, instanceUrl } = salesforce_session;
  
    if (!accessToken || !instanceUrl) {
        return res.status(401).json({ error: 'Not authenticated with Salesforce' });
    }
    // Create a new connection to Salesforce
    const conn = new jsforce.Connection({
        accessToken,
        instanceUrl
    });
  
    try {
      // Query Salesforce for contacts
        const result = await conn.query(`
            SELECT Id,
                FirstName,
                LastName,
                RegisteredID__c,
                Gender__c,
                Birthdate,
                AdsorbtionDate__c,
                Type__c,
                Phone,
                Email,
                CityName__c
            FROM Contact
            WHERE RegisteredID__c LIKE '_________'
            LIMIT 100
        `);
        res.json(result.records);
    } catch (err) {
        console.error('Error fetching contacts:', err);
        res.status(500).json({ error: err.message });
    }
});


router.get('/campaignsExample', async (req, res) => {
    const { accessToken, instanceUrl } = salesforce_session;
  
    if (!accessToken || !instanceUrl) {
        return res.status(401).json({ error: 'Not authenticated with Salesforce' });
    }
    // Create a new connection to Salesforce
    const conn = new jsforce.Connection({
        accessToken,
        instanceUrl
    });
  
    try {
      // Query Salesforce for campaign
        const result = await conn.query(`
            SELECT Id,
                OwnerId,
                Name,
                IsActive,
                Type,
                Status,
                StartDate,
                EndDate,
                NumberOfContacts,
                NumberOfLeads,
                NumberOfConvertedLeads,
                NumberOfResponses,
                NumberSent,
                ParentId,
                Activities_Days_And_Hours__c,
                ActivityLocation__c,
                AmountAllOpportunities,
                AmountWonOpportunities,
                CreatedById,
                CreatedDate,
                LastModifiedById,
                LastModifiedDate
            FROM Campaign
            LIMIT 10
        `);
        res.json(result.records);
    } catch (err) {
        console.error('Error fetching campaign:', err);
        res.status(500).json({ error: err.message });
    }
});


router.get('/campaignMembersExample', async (req, res) => {
    const { accessToken, instanceUrl } = salesforce_session;
  
    if (!accessToken || !instanceUrl) {
        return res.status(401).json({ error: 'Not authenticated with Salesforce' });
    }
    // Create a new connection to Salesforce
    const conn = new jsforce.Connection({
        accessToken,
        instanceUrl
    });
  
    try {
      // Query Salesforce for campaign
        const result = await conn.query(`
            SELECT Id,
            CampaignId,
            ContactId,
            Status,
            HasResponded,
            Name,
            Title
            FROM CampaignMember
            WHERE Status 
            LIMIT 10
        `);
        res.json(result.records);
    } catch (err) {
        console.error('Error fetching campaign:', err);
        res.status(500).json({ error: err.message });
    }
});