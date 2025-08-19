// A reusable module that handles MongoDB connections

const { MongoClient } = require('mongodb');

// MongoDB env. variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.DATABASE_NAME || 'mandalat_halev';

// Add debug logging
console.log('🔗 MONGODB_URI:', MONGODB_URI);

let client = null;
let db = null;

/**
 * Connect to MongoDB and return the database instance
 * @returns {Promise<Database>} MongoDB database instance
 */
async function connectToDatabase() {
   try {
      if (!client) {
         console.log('Connecting to MongoDB...');
         
         // Updated SSL options for newer MongoDB driver
         const options = {
            tls: true,
            serverSelectionTimeoutMS: 30000, // 30 seconds
            connectTimeoutMS: 30000,
            socketTimeoutMS: 30000,
         };
         
         client = new MongoClient(MONGODB_URI, options);
         await client.connect();
         console.log('Connected to MongoDB successfully');
      }

      if (!db) {
         db = client.db(DATABASE_NAME)
         console.log(`Using database: ${DATABASE_NAME}`);
      }

      return db;
   } catch (error) {
      console.error('MongoDB connection failed', error);
      throw error;
   } 
}

/**
 * Get the push tokens collection
 * @returns {Promise<Collection>} MongoDB collection for push tokens
 */
async function getPushTokensCollection() {
   const database = await connectToDatabase();
   return database.collection('user_push_tokens');
}

/**
 * Close the MongoDB connection
 */
async function closeConnection() {
   if (client) {
      await client.close();
      client = null;
      console.log('MongoDB connection closed');
   }
}

module.exports = {
   connectToDatabase,
   getPushTokensCollection,
   closeConnection
}