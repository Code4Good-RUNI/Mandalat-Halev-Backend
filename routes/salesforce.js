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

const router = express.Router();

/**
 * Session storage for Salesforce authentication tokens
 * (change later to a more secure session storage solution)
 */
let salesforce_session = {
    accessToken: null,
    instanceUrl: null
};

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
router.get('/contacts', async (req, res) => {
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
        const result = await conn.query('SELECT Id, FirstName, LastName FROM Contact LIMIT 10');
        res.json(result.records);
    } catch (err) {
        console.error('Error fetching contacts:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;