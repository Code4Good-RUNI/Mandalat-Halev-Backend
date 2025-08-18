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
