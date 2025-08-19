require('dotenv').config();
var express = require('express');
var logger = require('morgan');

const { notFoundHandler, errorHandler } = require('./middleware/error-handlers');
const { createRequest } = require('./utils/makeRequest');
var authRouter = require('./routes/user_auth');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// routes:
app.use('/user_auth', authRouter);
app.use('/register-push-token', require('./routes/register-push-token'));
app.use('/register-push-token-test', require('./routes/register-push-token-test'));
app.use('/debug', require('./routes/debug/show-objects'));
app.use('/status', require('./routes/debug/status'));
app.use('/user/details', require('./routes/userRoutes/getUserDetails'));

// error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

const TEST_USER = {
    userId: process.env.test_userId,
    email: process.env.test_user_email
};
// Initialize Salesforce connection on startup
async function initializeSalesforce() {
    try {
        console.log('🔑 Initializing Salesforce connection...');
        
        // Debug environment variables
        console.log('Environment check:');
        console.log('  host:', process.env.host || 'NOT SET');
        console.log('  client_id:', process.env.client_id ? 'SET' : 'NOT SET');
        console.log('  client_secret:', process.env.client_secret ? 'SET' : 'NOT SET');
        
        if (!process.env.host || !process.env.client_id || !process.env.client_secret) {
            throw new Error('Missing required Salesforce environment variables. Please check your .env file.');
        }
        
        // Test the connection using the retry utility
        const { withSalesforceRetry } = require('./utils/salesforceRetry');
        
        await withSalesforceRetry(async (conn) => {
            // Simple test query
            const result = await conn.query('SELECT COUNT() FROM Contact LIMIT 1');
            console.log(`result: ${JSON.stringify(result)}`);
            console.log(`✅ Salesforce connection established successfully (${result.totalSize} contacts found)`);
            return result;
        });
        
    } catch (error) {
        console.error('❌ Failed to initialize Salesforce connection:', error.message);
        console.error('   Server will continue but Salesforce features may not work');
        console.error('   Please check your .env file and Salesforce credentials');
    }
}
async function initializeUserConnection() {
    try {

        console.log(`[APP.JS]🔑 Initializing User connection for ${TEST_USER.email}...`);
        console.log('[APP.JS]Requesting authentication code...');
        const response1= await createRequest('POST', '/user_auth/request-code', TEST_USER);
        if(response1.status !== 200) {
            throw new Error('Failed to request authentication code');
        }
        console.log('[APP.JS]✅ Authentication code requested successfully');
        console.log('[APP.JS][2] - Verifying authentication code...');
        console.log('[APP.JS]Using code from environment variable or defaulting to 000000');
        const code = process.env.code || '000000'; // Use the code from environment variable
        const response2 = await createRequest('POST', '/user_auth/verify-code', { ...TEST_USER, code });
        if(response2.status !== 200 || !response2.data.token) {
            throw new Error('Failed to verify authentication code');
        }
        console.log('[APP.JS]✅ Authentication code verified successfully');
        process.env.user_token = response2.data.token;
        console.log(`[APP.JS]✅ User token ${process.env.user_token} saved to environment variable`);

        console.log('[APP.JS][3] - Checking User connection...');
        const response3 = await createRequest('GET', '/user_auth/protected-contacts', null, { Authorization: `Bearer ${process.env.user_token}` });
        if(response3.status !== 200) {
            throw new Error('Failed to check User connection');
        }
        console.log('[APP.JS]✅ User connection is active');

    } catch (error) {
        console.error('❌ Failed to initialize User connection:', error.message);
    }
}

// Initialize Salesforce when the module is loaded
initializeSalesforce();
initializeUserConnection();

module.exports = app;