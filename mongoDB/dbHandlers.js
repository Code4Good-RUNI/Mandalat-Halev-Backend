require('dotenv').config(); // Load environment variables from .env file

const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;    // e.g. 'mongodb://localhost:27017'
if(!uri) {
    throw new Error('[In dbHandlers]: MONGODB_URI environment variable is not set');
}

const client = new MongoClient(uri); // create a MongoDB client instance

async function connectDB() {
    try {
        console.log('[In dbHandlers]: Connecting to MongoDB');
        await client.connect(); // Connect to MongoDB
        console.log('[In dbHandlers]: Connected to MongoDB successfully');
    }
    catch (error) {
        console.error('[In dbHandlers]: Error connecting to MongoDB:', error);
        throw error; // re-throw to handle it in the calling function
    }
}
async function fetchEvents() {
    try {await connectDB();}
    catch (error) { // Connection failed, log the error
        console.error('[In dbHandlers]: Failed to connect to MongoDB:', error);
        await client.close(); // ensure we close the connection on error
        throw error; // re-throw to handle it in the calling function
    }

    console.log(`[In dbHandlers]: Fetching events...`);
    try {
        const db = client.db('MandalatHalevDB'); // use the correct database
        const eventsCollection = await db.collection('events').find().toArray(); // fetch the 'events' collection as an array
        await client.close(); // close the connection after fetching
        console.log(`[In dbHandlers]: Fetched ${eventsCollection.length} events successfully`);
        return eventsCollection.map(event => ({
            eventName: event.eventName,
            eventDate: event.eventDate.toISOString().slice(0,10),
            eventLocation: event.eventLocation,
            eventTime: event.eventTime,
            contactIds: event.contactIds
        }));
    }
    catch (error) {
        console.error('[In dbHandlers]: Error fetching events:', error);
        await client.close(); // ensure we close the connection on error
        return []; // return an empty array on error
    }
}
module.exports = { connectDB, fetchEvents };