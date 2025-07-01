// Helper for Salesforce contact lookup
const salesforce_session = require('../salesforce-session');
const jsforce = require('jsforce');

async function getContactByIdAndEmail(userId, email) {
  const { accessToken, instanceUrl } = salesforce_session;
  if (!accessToken || !instanceUrl) return null;
  const conn = new jsforce.Connection({ accessToken, instanceUrl });
  try {
    const result = await conn.query(
      `SELECT Id, Email FROM Contact WHERE Id = '${userId}' AND Email = '${email}' LIMIT 1`
    );
    return result.records[0] || null;
  } catch {
    return null;
  }
}

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

module.exports = { getContactByIdAndEmail, querySalesforceObjectWithParams };
