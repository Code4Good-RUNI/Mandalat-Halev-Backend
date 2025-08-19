require('dotenv').config();
var express = require('express');
var logger = require('morgan'); // Using morgan for logging requests

const { notFoundHandler, errorHandler } = require('./middleware/error-handlers');
var authRouter = require('./routes/auth');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// routes:
app.use('/auth', authRouter);
app.use('/register-push-token', require('./routes/register-push-token'));
app.use('/register-push-token-test', require('./routes/register-push-token-test')); // For testing- remove in production 
app.use('/send-push-test', require('./routes/send-push-test'));
app.use('/check-receipts', require('./routes/check-receipts'));  // add this


// error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);


module.exports = app;
