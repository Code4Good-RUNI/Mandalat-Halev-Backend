// require('dotenv').config();
// var express = require('express');
// var logger = require('morgan'); // Using morgan for logging requests

// const { notFoundHandler, errorHandler } = require('./middleware/error-handlers');
// var authRouter = require('./routes/auth');

// var app = express();

// app.use(logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));

// // routes:
// app.use('/auth', authRouter);
// app.use('/register-push-token', require('./routes/register-push-token'));
// app.use('/register-push-token-test', require('./routes/register-push-token-test')); // For testing- remove in production 


// // error handling middleware
// app.use(notFoundHandler);
// app.use(errorHandler);


// module.exports = app;
require('dotenv').config();
var express = require('express');
var logger = require('morgan');

const { notFoundHandler, errorHandler } = require('./middleware/error-handlers');
var authRouter = require('./routes/auth');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// routes:
app.use('/auth', authRouter);
app.use('/register-push-token', require('./routes/register-push-token'));
app.use('/register-push-token-test', require('./routes/register-push-token-test'));
app.use('/debug', require('./routes/debug/show-objects'));

// error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

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
            console.log(`✅ Salesforce connection established successfully (${result.totalSize} contacts found)`);
            return result;
        });
        
    } catch (error) {
        console.error('❌ Failed to initialize Salesforce connection:', error.message);
        console.error('   Server will continue but Salesforce features may not work');
        console.error('   Please check your .env file and Salesforce credentials');
    }
}

// Initialize Salesforce when the module is loaded
initializeSalesforce();

module.exports = app;