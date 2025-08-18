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
const salesforce_session = require('../salesforce-session');
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

        res.json({ message: 'Successfully authenticated with Salesforce' });
    } catch (err) {
        console.error('Authentication error:', err);
        res.status(500).json({ error: err.message });
    }
});


/** START User Functions */

