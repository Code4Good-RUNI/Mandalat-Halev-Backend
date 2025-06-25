/**
 * Salesforce Integration Router
 * This module handles authentication and data retrieval from Salesforce using the OAuth 2.0 Client Credentials flow.
 * 
 * Required Environment Variables:
 * - host: Salesforce login URL
 * - client_id: Connected App's Consumer Key
 * - client_secret: Connected App's Consumer Secret
 */

const express = require('express');
const jsforce = require('jsforce');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const salesforce_session = require('./salesforce-session');
const authenticate = require('../middleware/auth');

const router = express.Router();

/**
 * Initialize Salesforce connection using client_credentials flow
 * 
 * This endpoint performs the OAuth 2.0 Client Credentials flow to obtain an access token.
 * 
 * @route GET /initialize
 * @returns {Object} JSON response indicating success or failure
 */
router.get('/initialize', async (req, res) => {
    try {
        // Make a direct POST request to Salesforce OAuth endpoint
        const tokenResponse = await fetch(`${process.env.host}/services/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: process.env.client_id,
                client_secret: process.env.client_secret
            })
        });

        const data = await tokenResponse.json();

        // Handle potential OAuth errors
        if (data.error) {
            throw new Error(`Salesforce auth error: ${data.error_description || data.error}`);
        }

        // Store the session tokens
        salesforce_session.accessToken = data.access_token;
        salesforce_session.instanceUrl = data.instance_url;

        //console.log('Authentication successful:', {
        //    accessToken: salesforce_session.accessToken,
        //    instanceUrl: salesforce_session.instanceUrl
        //});

        res.json({ message: 'Successfully authenticated with Salesforce' });
    } catch (err) {
        console.error('Authentication error:', err);
        res.status(500).json({ error: err.message });
    }
});

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

async function querySalesforceObjectWithParams(config) {
    const {
        conn,
        objectName,
        params = {}, // Default to empty object if no params
        availableParams,
        fieldMapping,
        outputFields,
        orderBy = ''
    } = config;

    // Validate connection
    if (!conn || !conn.accessToken) {
        throw new Error('Invalid Salesforce connection');
    }

    // Extract special parameters from the rest of the search parameters
    // Only 'limit' is treated specially now, not as search criteria
    const { limit, ...searchParams } = params;

    // Auto-detect if this is an empty search (no search parameters)
    // This allows the function to return all records when no filters are specified
    const hasSearchParams = Object.keys(searchParams).length > 0;

    // Track which parameters map to which fields for better error messages
    const paramToFieldMap = {};

    try {
        // Always use the default fields - no custom field selection allowed
        const selectFields = outputFields;

        // Build WHERE conditions for the SOQL query
        const whereConditions = [];

        if (hasSearchParams) {
            // Process each search parameter
            Object.entries(searchParams).forEach(([userParam, value]) => {
                // Skip empty, null, or undefined values
                if (value === undefined || value === null || value === '') {
                    return;
                }

                let fieldName;
                
                // Determine the Salesforce field name for this parameter
                if (fieldMapping[userParam]) {
                    // Use the mapped field name if available
                    fieldName = fieldMapping[userParam];
                } else if (availableParams.includes(userParam)) {
                    // If it's in availableParams but not mapped, use the parameter name as-is
                    // This handles cases where the parameter name matches the Salesforce field name
                    fieldName = userParam;
                } else {
                    // Parameter is not in availableParams - treat it as a custom field
                    // This allows flexibility for querying custom fields not explicitly listed
                    console.warn(`Using custom field parameter: ${userParam}`);
                    fieldName = userParam;
                }

                // Store the mapping for error handling
                paramToFieldMap[userParam] = fieldName;

                // Escape single quotes in the value to prevent SOQL injection
                const escapedValue = String(value).replace(/'/g, "\\'");
                
                // Handle different data types appropriately for SOQL
                if (fieldName.toLowerCase().includes('date') || 
                    value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    // Date fields - SOQL expects dates without quotes
                    whereConditions.push(`${fieldName} = ${value}`);
                } else if (!isNaN(value) && fieldName.toLowerCase().includes('number')) {
                    // Numeric fields - no quotes needed
                    whereConditions.push(`${fieldName} = ${value}`);
                } else {
                    // String fields - wrap in single quotes
                    whereConditions.push(`${fieldName} = '${escapedValue}'`);
                }
            });
        }

        // Build the SOQL query
        let soqlQuery = `SELECT ${selectFields.join(', ')} FROM ${objectName}`;
        
        // Add WHERE clause if we have any conditions
        if (whereConditions.length > 0) {
            soqlQuery += ` WHERE ${whereConditions.join(' AND ')}`;
        }

        // Add ORDER BY clause if specified
        if (orderBy) {
            soqlQuery += ` ORDER BY ${orderBy}`;
        }

        // Add LIMIT clause only if user specified one
        let limitValue = limit ? parseInt(limit) : null;
        if (limitValue && !isNaN(limitValue) && limitValue > 0) {
            soqlQuery += ` LIMIT ${limitValue}`;
        }

        // Log the query for debugging purposes
        console.log(`Executing ${objectName} query:`, soqlQuery);

        // Execute the SOQL query
        const result = await conn.query(soqlQuery);
        
        // Return a structured response with both data and metadata
        return {
            objectType: objectName,
            totalSize: result.totalSize,
            records: result.records,
            query: {
                searchCriteria: searchParams,
                fieldsReturned: selectFields,
                soqlQuery: soqlQuery // Include the actual query for transparency/debugging
            }
        };

    } catch (err) {
        // Log the error for debugging
        console.error(`Error fetching ${objectName}:`, err);
        
        // Check if this is a "field not found" error from Salesforce
        if (err.message && err.message.includes('No such column')) {
            // Extract the field name from the error message
            const fieldMatch = err.message.match(/No such column '(\w+)'/);
            const fieldName = fieldMatch ? fieldMatch[1] : 'unknown';
            
            // Find which user parameter maps to this field
            let userParam = fieldName;
            
            // Check our reverse mapping from this query
            for (const [param, field] of Object.entries(paramToFieldMap)) {
                if (field === fieldName) {
                    userParam = param;
                    break;
                }
            }
            
            // If not found in current query, check the general fieldMapping
            if (userParam === fieldName) {
                for (const [param, field] of Object.entries(fieldMapping)) {
                    if (field === fieldName) {
                        userParam = param;
                        break;
                    }
                }
            }
            
            // Create a custom error object with more details
            const customError = new Error(`Field '${userParam}' does not exist on ${objectName}`);
            customError.code = 'INVALID_FIELD';
            customError.field = userParam;
            customError.availableParams = availableParams;
            throw customError;
        }
        
        // For other errors, re-throw as is
        throw err;
    }
}



/** START User Functions */

/**
 * Express route handler for fetching Salesforce contacts
 * 
 * @route GET /contacts
 * 
 * @queryparam {string} [firstName] - Contact's first name
 * @queryparam {string} [lastName] - Contact's last name
 * @queryparam {string} [email] - Contact's email address
 * @queryparam {string} [phone] - Contact's phone number
 * @queryparam {string} [id] - Contact's registered ID (maps to RegisteredID__c)
 * @queryparam {string} [city] - Contact's city (maps to CityName__c)
 * @queryparam {string} [type] - Contact type (maps to Type__c)
 * @queryparam {string} [gender] - Contact's gender (maps to Gender__c)
 * @queryparam {string} [birthDate] - Birth date in YYYY-MM-DD format
 * @queryparam {string} [adsorbtionDate] - Adsorbtion date in YYYY-MM-DD format (maps to AdsorbtionDate__c)
 * @queryparam {number} [limit] - Maximum number of records to return
 * 
 * Note: The 'fields' parameter is no longer supported. All queries return the default fields.
 */
router.get('/contacts', async (req, res) => {
    const { accessToken, instanceUrl } = salesforce_session;
    
    if (!accessToken || !instanceUrl) {
        return res.status(401).json({ error: 'Not authenticated with Salesforce' });
    }

    const conn = new jsforce.Connection({
        accessToken,
        instanceUrl
    });

    // Configuration for Contact object
    const contactConfig = {
        conn,
        objectName: 'Contact',
        params: req.query,
        availableParams: [
            'firstName', 'lastName', 'email', 'phone', 
            'id', 'city', 'type', 'gender', 
            'birthDate', 'adsorbtionDate'
        ],
        fieldMapping: {
            firstName: 'FirstName',
            lastName: 'LastName',
            email: 'Email',
            phone: 'Phone',
            id: 'RegisteredID__c',
            city: 'CityName__c',
            type: 'Type__c',
            gender: 'Gender__c',
            birthDate: 'Birthdate',
            adsorbtionDate: 'AdsorbtionDate__c'
        },
        outputFields: [
            'Id', 'FirstName', 'LastName', 'RegisteredID__c', 'Gender__c',
            'Birthdate', 'AdsorbtionDate__c', 'Type__c', 'Phone', 
            'Email', 'CityName__c'
        ],
        orderBy: 'LastName, FirstName'
    };

    try {
        const result = await querySalesforceObjectWithParams(contactConfig);
        res.json(result);
        
    } catch (err) {
        console.error('Error in /contacts endpoint:', err);
        
        // Handle custom field errors
        if (err.code === 'INVALID_FIELD') {
            return res.status(400).json({ 
                error: err.message,
                invalidField: err.field,
                availableParams: err.availableParams,
                hint: 'Use only the available parameters listed above or ensure the field exists in Salesforce'
            });
        }
        
        // For other errors, return generic 500
        res.status(500).json({ error: err.message });
    }
});

// TODO: Implement other user functions like /campaigns, /campaignMembers, etc.


/** END User Functions (Omer & Rotem) */

module.exports = router;



//! START Describe Salesforce Object Metadata

router.get('/describe', async (req, res) => {
    const { accessToken, instanceUrl } = salesforce_session;
  
    if (!accessToken || !instanceUrl) {
        return res.status(401).json({ error: 'Not authenticated with Salesforce' });
    }
    // Create a new connection to Salesforce
    const conn = new jsforce.Connection({
        accessToken,
        instanceUrl
    });
    // use the exportObjectMetadata function to get metadata for a specific object
    try {
        // PUT HERE THE OBJECT NAME YOU WANT TO DESCRIBE
        const metadata = await exportObjectMetadata(conn, 'CampaignMember');
        res.json(metadata);
    }
    catch (err) {
        console.error('Error fetching object metadata:', err);
        res.status(500).json({ error: err.message });
    }
});


const fs = require('fs').promises;
const path = require('path');

/**
 * Creates two files containing Salesforce object metadata:
 * 1. Raw fields metadata as JSON
 * 2. Human-readable label to API name mapping
 * 
 * @param {Object} conn - jsforce connection object
 * @param {string} objectName - Name of the Salesforce object (e.g., 'Campaign', 'Contact', 'Account')
 * @returns {Promise<Object>} Object containing file paths and field count
 */
async function exportObjectMetadata(conn, objectName) {
    try {
        // Get object metadata
        console.log(`Fetching metadata for ${objectName}...`);
        const objectMetadata = await conn.describe(objectName);
        
        // Create timestamp for unique file naming
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // File paths
        // const rawMetadataFile = `${objectName}_raw_metadata_${timestamp}.json`;
        // const labelMappingFile = `${objectName}_label_mapping_${timestamp}.txt`;

        const rawMetadataFile = path.join('descriptions', `${objectName}_raw_metadata_${timestamp}.json`);
        const labelMappingFile = path.join('descriptions', `${objectName}_label_mapping_${timestamp}.txt`);
        
        // Prepare raw metadata (formatted JSON)
        const rawMetadataContent = JSON.stringify(objectMetadata.fields, null, 2);
        
        // Prepare label to API name mapping
        let labelMappingContent = `Salesforce Object: ${objectName}\n`;
        labelMappingContent += `Generated: ${new Date().toLocaleString()}\n`;
        labelMappingContent += `Total Fields: ${objectMetadata.fields.length}\n`;
        labelMappingContent += '='.repeat(60) + '\n\n';
        
        objectMetadata.fields.forEach((field, index) => {
            labelMappingContent += `${index + 1}. Label: "${field.label}" → API Name: "${field.name}"\n`;
            if (field.type) {
                labelMappingContent += `   Type: ${field.type}`;
            }
            if (field.length) {
                labelMappingContent += `, Length: ${field.length}`;
            }
            if (field.custom) {
                labelMappingContent += `, Custom Field: ${field.custom}`;
            }
            labelMappingContent += '\n\n';
        });
        
        // Write files
        await fs.writeFile(rawMetadataFile, rawMetadataContent, 'utf8');
        await fs.writeFile(labelMappingFile, labelMappingContent, 'utf8');
        
        const result = {
            success: true,
            objectName: objectName,
            fieldCount: objectMetadata.fields.length,
            files: {
                rawMetadata: path.resolve(rawMetadataFile),
                labelMapping: path.resolve(labelMappingFile)
            }
        };
        
        console.log(`✅ Successfully exported ${objectName} metadata:`);
        console.log(`📄 Raw metadata: ${rawMetadataFile}`);
        console.log(`📋 Label mapping: ${labelMappingFile}`);
        console.log(`🔢 Total fields: ${objectMetadata.fields.length}`);
        
        return result;
        
    } catch (error) {
        console.error(`❌ Error exporting metadata for ${objectName}:`, error.message);
        throw error;
    }
}

//! END Describe Salesforce Object Metadata

// Protected route example
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