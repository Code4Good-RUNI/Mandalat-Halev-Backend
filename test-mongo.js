// Extract the MangoClient function from the objects returned by require
// The MangoClient function is a factory function for creating client objects
const { MongoClient } = require('mongodb');

async function testConnection() {
   const client = new MongoClient('mongodb://localhost:27017');

   try {
      await client.connect();
      console.log('Succesfully connected to MongoDB');

      // List databases to confirm connection
      const adminDb = client.db().admin();
      const databases = await adminDb.listDatabases();
      console.log('Available databases:', databases.databases.map(db => db.name));
   } catch (error) {
      console.error('MongoDB connection failed:', error);
   } finally {
      await client.close();
   }
}

testConnection()