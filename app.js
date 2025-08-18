require('dotenv').config();
var express = require('express');
var logger = require('morgan'); // Using morgan for logging requests

var authRouter = require('./routes/on-user-request/auth');

var app = express();
const { notFoundHandler, errorHandler } = require('./middleware/error-handlers');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// routes:
app.use('/auth', authRouter);

// error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
