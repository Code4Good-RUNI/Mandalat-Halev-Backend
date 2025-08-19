const express = require('express');
const { Expo } = require('expo-server-sdk');
const { getPushTokensCollection } = require('../utils/mongodb');

const router = express.Router();

// Create a new Expo SDK client
let expo = new Expo();

/**
 * TEST VERSION: Send a push notification to a specific contact_id
 * This is for testing purposes only
 * 
 * @route POST /send-push-test
 * @body {string} contact_id - The contact ID to send the notification to
 * @body {string} title - The notification title (optional)
 * @body {string} body - The notification body (optional)
 * @returns {Object} Success message and delivery status
 * @throws {400} If contact_id is missing or no token found
 * @throws {500} If sending fails
 */
router.post('/', async (req, res) => {
    try {
        const { contact_id, title = "Test Notification", body = "This is a test push notification from your server!" } = req.body;
        
        // Validate that contact_id is provided
        if (!contact_id) {
            return res.status(400).json({ 
                error: 'contact_id is required' 
            });
        }
        
        // Get the push tokens collection
        const collection = await getPushTokensCollection();
        
        // Find the push token for this contact
        const tokenDoc = await collection.findOne({ contact_id: contact_id });
        
        if (!tokenDoc) {
            return res.status(400).json({ 
                error: `No push token found for contact_id: ${contact_id}` 
            });
        }
        
        const pushToken = tokenDoc.token;
        
        // Check that the token is a valid Expo push token
        if (!Expo.isExpoPushToken(pushToken)) {
            return res.status(400).json({ 
                error: `Invalid Expo push token: ${pushToken}` 
            });
        }
        
        // Create the notification message
        const message = {
            to: pushToken,
            sound: 'default',
            title: title,
            body: body,
            data: { 
                contact_id: contact_id,
                timestamp: new Date().toISOString(),
                test: true
            },
        };
        
        console.log(`🚀 [TEST] Sending push notification to contact: ${contact_id}`);
        console.log(`📱 Token: ${pushToken}`);
        console.log(`📋 Message:`, message);
        
        // Send the notification
        const chunks = expo.chunkPushNotifications([message]);
        const tickets = [];
        
        for (let chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log('📬 Ticket chunk:', ticketChunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('❌ Error sending chunk:', error);
                throw error;
            }
        }
        
        // Check for errors in tickets
        const errors = tickets.filter(ticket => ticket.status === 'error');
        if (errors.length > 0) {
            console.error('❌ Push notification errors:', errors);
            return res.status(500).json({
                error: 'Failed to send some notifications',
                tickets: tickets,
                errors: errors
            });
        }
        
        console.log(`✅ [TEST] Push notification sent successfully to contact: ${contact_id}`);
        
        // Return success response
        res.json({
            success: true,
            message: `Test push notification sent successfully to contact: ${contact_id}`,
            data: {
                contact_id: contact_id,
                token: pushToken,
                notification: {
                    title: title,
                    body: body
                },
                tickets: tickets,
                sent_at: new Date().toISOString()
            },
            note: "TEST VERSION - For testing purposes only"
        });
        
    } catch (error) {
        console.error('❌ Error sending push notification:', error);
        res.status(500).json({ 
            error: 'Failed to send push notification',
            details: error.message 
        });
    }
});

module.exports = router;