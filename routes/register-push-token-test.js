const express = require('express');
const { getPushTokensCollection } = require('../utils/mongodb');

const router = express.Router();

/**
 * TEST VERSION: Register or update a push token WITHOUT authentication
 * This is for testing purposes only - bypasses JWT authentication
 * 
 * @route POST /register-push-token-test
 * @body {string} token - The Expo push token from the mobile app
 * @body {string} contact_id - Test contact ID (for testing without auth)
 * @returns {Object} Success message and stored data
 * @throws {400} If token or contact_id is missing
 * @throws {500} If database operation fails
 */
router.post('/', async (req, res) => {
    try {
        // Extract the push token and test contact_id from request body
        const { token, contact_id } = req.body;
        
        // Validate that both token and contact_id are provided
        if (!token) {
            return res.status(400).json({ 
                error: 'Push token is required' 
            });
        }
        
        if (!contact_id) {
            return res.status(400).json({ 
                error: 'contact_id is required for testing' 
            });
        }
        
        // Get the push tokens collection
        const collection = await getPushTokensCollection();
        
        // Create the document to store/update
        const pushTokenDoc = {
            contact_id: contact_id,
            token: token,
            updated_at: new Date()
        };
        
        // Use upsert to either insert new document or update existing one
        const result = await collection.replaceOne(
            { contact_id: contact_id }, // Find document with this contact_id
            pushTokenDoc,               // Replace it with this document
            { upsert: true }           // Create new document if none exists
        );
        
        // Log the operation for debugging
        console.log(`📱 [TEST] Push token ${result.upsertedCount > 0 ? 'registered' : 'updated'} for contact: ${contact_id}`);
        
        // Return success response
        res.json({
            success: true,
            message: result.upsertedCount > 0 ? 'Push token registered successfully' : 'Push token updated successfully',
            data: {
                contact_id: contact_id,
                token_registered: true,
                updated_at: pushTokenDoc.updated_at
            },
            note: "TEST VERSION - No authentication required"
        });
        
    } catch (error) {
        console.error('❌ Error registering push token:', error);
        res.status(500).json({ 
            error: 'Failed to register push token',
            details: error.message 
        });
    }
});

module.exports = router;