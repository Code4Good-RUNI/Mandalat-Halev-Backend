// /**
//  * Retrieve contacts from Salesforce
//  * 
//  * This endpoint demonstrates how to use the access token to make API requests to Salesforce.
//  * It retrieves a list of contacts with basic information.
//  * 
//  * @route GET /contacts
//  * @returns {Object[]} Array of contact records
//  * @throws {401} If not authenticated with Salesforce
//  * @throws {500} If there's an error fetching contacts
//  */
// router.get('/contactsExample', async (req, res) => {
//     const { accessToken, instanceUrl } = salesforce_session;
  
//     if (!accessToken || !instanceUrl) {
//         return res.status(401).json({ error: 'Not authenticated with Salesforce' });
//     }
//     // Create a new connection to Salesforce
//     const conn = new jsforce.Connection({
//         accessToken,
//         instanceUrl
//     });
  
//     try {
//       // Query Salesforce for contacts
//         const result = await conn.query(`
//             SELECT Id,
//                 FirstName,
//                 LastName,
//                 RegisteredID__c,
//                 Gender__c,
//                 Birthdate,
//                 AdsorbtionDate__c,
//                 Type__c,
//                 Phone,
//                 Email,
//                 CityName__c
//             FROM Contact
//             WHERE RegisteredID__c LIKE '_________'
//             LIMIT 100
//         `);
//         res.json(result.records);
//     } catch (err) {
//         console.error('Error fetching contacts:', err);
//         res.status(500).json({ error: err.message });
//     }
// });


// router.get('/campaignsExample', async (req, res) => {
//     const { accessToken, instanceUrl } = salesforce_session;
  
//     if (!accessToken || !instanceUrl) {
//         return res.status(401).json({ error: 'Not authenticated with Salesforce' });
//     }
//     // Create a new connection to Salesforce
//     const conn = new jsforce.Connection({
//         accessToken,
//         instanceUrl
//     });
  
//     try {
//       // Query Salesforce for campaign
//         const result = await conn.query(`
//             SELECT Id,
//                 OwnerId,
//                 Name,
//                 IsActive,
//                 Type,
//                 Status,
//                 StartDate,
//                 EndDate,
//                 NumberOfContacts,
//                 NumberOfLeads,
//                 NumberOfConvertedLeads,
//                 NumberOfResponses,
//                 NumberSent,
//                 ParentId,
//                 Activities_Days_And_Hours__c,
//                 ActivityLocation__c,
//                 AmountAllOpportunities,
//                 AmountWonOpportunities,
//                 CreatedById,
//                 CreatedDate,
//                 LastModifiedById,
//                 LastModifiedDate
//             FROM Campaign
//             LIMIT 10
//         `);
//         res.json(result.records);
//     } catch (err) {
//         console.error('Error fetching campaign:', err);
//         res.status(500).json({ error: err.message });
//     }
// });


// router.get('/campaignMembersExample', async (req, res) => {
//     const { accessToken, instanceUrl } = salesforce_session;
  
//     if (!accessToken || !instanceUrl) {
//         return res.status(401).json({ error: 'Not authenticated with Salesforce' });
//     }
//     // Create a new connection to Salesforce
//     const conn = new jsforce.Connection({
//         accessToken,
//         instanceUrl
//     });
  
//     try {
//       // Query Salesforce for campaign
//         const result = await conn.query(`
//             SELECT Id,
//             CampaignId,
//             ContactId,
//             Status,
//             HasResponded,
//             Name,
//             Title
//             FROM CampaignMember
//             WHERE Status 
//             LIMIT 10
//         `);
//         res.json(result.records);
//     } catch (err) {
//         console.error('Error fetching campaign:', err);
//         res.status(500).json({ error: err.message });
//     }
// });


const express = require('express');
const { withSalesforceRetry } = require('../../utils/salesforceRetry');

const router = express.Router();

/**
 * Get a sample of contacts from Salesforce
 * @route GET /debug/contacts
 */
router.get('/contacts', async (req, res) => {
    try {
        const result = await withSalesforceRetry(async (conn) => {
            const query = `
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
                WHERE RegisteredID__c != null
                LIMIT 10
            `;
            console.log('Executing query:', query);
            return await conn.query(query);
        });
        
        res.json({
            success: true,
            totalSize: result.totalSize,
            records: result.records,
            message: `Found ${result.records.length} contacts`
        });
    } catch (err) {
        console.error('Error fetching contacts:', err);
        res.status(500).json({ 
            error: 'Failed to fetch contacts',
            details: err.message 
        });
    }
});

/**
 * Get a sample of campaigns from Salesforce
 * @route GET /debug/campaigns
 */
router.get('/campaigns', async (req, res) => {
    try {
        const result = await withSalesforceRetry(async (conn) => {
            const query = `
                SELECT Id,
                    Name,
                    IsActive,
                    Type,
                    Status,
                    StartDate,
                    EndDate,
                    NumberOfContacts,
                    NumberOfLeads,
                    Activities_Days_And_Hours__c,
                    ActivityLocation__c,
                    CreatedDate
                FROM Campaign
                WHERE IsActive = true
                ORDER BY CreatedDate DESC
                LIMIT 5
            `;
            console.log('Executing query:', query);
            return await conn.query(query);
        });
        
        res.json({
            success: true,
            totalSize: result.totalSize,
            records: result.records,
            message: `Found ${result.records.length} active campaigns`
        });
    } catch (err) {
        console.error('Error fetching campaigns:', err);
        res.status(500).json({ 
            error: 'Failed to fetch campaigns',
            details: err.message 
        });
    }
});

/**
 * Get campaign members
 * @route GET /debug/campaign-members
 */
router.get('/campaign-members', async (req, res) => {
    try {
        const result = await withSalesforceRetry(async (conn) => {
            const query = `
                SELECT Id,
                    CampaignId,
                    ContactId,
                    Status,
                    HasResponded,
                    Name,
                    Title,
                    Campaign.Name,
                    Contact.FirstName,
                    Contact.LastName
                FROM CampaignMember
                WHERE Status != null
                LIMIT 10
            `;
            console.log('Executing query:', query);
            return await conn.query(query);
        });
        
        res.json({
            success: true,
            totalSize: result.totalSize,
            records: result.records,
            message: `Found ${result.records.length} campaign members`
        });
    } catch (err) {
        console.error('Error fetching campaign members:', err);
        res.status(500).json({ 
            error: 'Failed to fetch campaign members',
            details: err.message 
        });
    }
});

/**
 * Test any custom SOQL query
 * @route POST /debug/query
 * @body {string} query - The SOQL query to execute
 */
router.post('/query', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required in request body' });
        }
        
        const result = await withSalesforceRetry(async (conn) => {
            console.log('Executing custom query:', query);
            return await conn.query(query);
        });
        
        res.json({
            success: true,
            query: query,
            totalSize: result.totalSize,
            records: result.records,
            message: `Query returned ${result.records.length} records`
        });
    } catch (err) {
        console.error('Error executing custom query:', err);
        res.status(500).json({ 
            error: 'Failed to execute query',
            details: err.message,
            hint: 'Make sure your SOQL syntax is correct'
        });
    }
});

/**
 * Get basic Salesforce org info
 * @route GET /debug/org-info
 */
router.get('/org-info', async (req, res) => {
    try {
        const result = await withSalesforceRetry(async (conn) => {
            // Get basic org info
            const orgInfo = {
                instanceUrl: conn.instanceUrl,
                version: conn.version || 'Unknown'
            };
            
            // Get object counts
            const contactCount = await conn.query('SELECT COUNT() FROM Contact');
            const campaignCount = await conn.query('SELECT COUNT() FROM Campaign');
            const userCount = await conn.query('SELECT COUNT() FROM User WHERE IsActive = true');
            
            return {
                org: orgInfo,
                counts: {
                    contacts: contactCount.totalSize,
                    campaigns: campaignCount.totalSize,
                    activeUsers: userCount.totalSize
                }
            };
        });
        
        res.json({
            success: true,
            data: result,
            message: 'Salesforce org information retrieved successfully'
        });
    } catch (err) {
        console.error('Error fetching org info:', err);
        res.status(500).json({ 
            error: 'Failed to fetch org info',
            details: err.message 
        });
    }
});

module.exports = router;