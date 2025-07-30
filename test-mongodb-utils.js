const { connectToDatabase, getPushTokensCollection, closeConnection } = require('./utils/mongodb');

async function testMongoUtils() {
   try {
      console.log('Testing MOngoDB utilities... \n');

      // Test 1: Connect to database
      console.log('1. Testing database connection...');
      const db = await connectToDatabase();
      console.log('Database connection succesful\n');

      // Test 2: Get push tokens collection
      console.log('2. Testing collection access...');
      const collection = await getPushTokensCollection();
      console.log('Collection access successful');
      console.log(`   Collection name: ${collection.collectionName}\n`);


        // Test 3: List existing collections (should be empty for new database)
        console.log('3. Listing collections in database...');
        const collections = await db.listCollections().toArray();
        console.log('   Existing collections:', collections.map(c => c.name));
        
        console.log('\n All tests passed!');
   } catch (error) {
      console.error('Test failed:', error);
   } finally {
      await closeConnection();
   }
}

testMongoUtils();