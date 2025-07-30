const express = require('express');
const { getPushTokensCollection } = require('../utils/mongodb');
const authenticate = require('../middleware/auth');

const router = express.Router();

/**
 * Register or update a push token for the authenticated user
 * 
 * @route POST /register-push-token
 * @body {string} token - The Expo push token from the mobile app
 * @returns {Object} Success message and stored data
 * @throws {400} If token is missing
 * @throws {401} If user is not authenticated
 * @throws {500} If database operation failes
 */
router.post('/', authenticate, async (req, res) => {
   try {
      // Extract the push token from request body
      const { token } = req.body;

      // Validate that token is provided
      if (!token) {
         return res.status(400).json({
            error: 'Push token is required'
         });
      }

      // Get the contact_id from the authenticated user
      const contact_id = req.user.userId;

      // Get the push tokens collection
      const collection = await getPushTokensCollection();

      // Create the document to store/update
      const pushTokenDoc = {
         contact_id: contact_id,
         token: token,
         updated_at: new Date()
      };

      // Use upsert to either insert new document or update existing one
      // This handles the "overwrite if already present" requirement
      const result = await collection.replaceOne(
         { contact_id: contact_id }, // Find document with this contact_id
         pushTokenDoc,               // Replace it with this document
         { upsert: true }            // Create new document if none exists
      );

      // Log in the operation for debugging
      console.log(`Push token ${result.upsertedCount > 0 ? 'registered' : 'updated'} for contact: ${contact_id}`);

      // Return success response
      res.json({
         success: true,
         message: result.upsertedCount > 0 ? 'Push token registered successfully' : 'Push token updated successfully',
         data: {
            contact_id: contact_id,
            token_registered: true,
            updated_at: pushTokenDoc.updated_at
         }
      });

   } catch (error) {
      console.error('Error registering push token:', error);
      res.status(500).json({
         error: 'Failed to register push token',
         details: error.message
      });
   }
});

module.exports = router;