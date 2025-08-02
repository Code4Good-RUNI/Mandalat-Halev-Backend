
// Old - Commented out for testing register-push-token functionallity
// TODO- Uncomment and open issue- error on npm start


// var createError = require('http-errors');

// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// }); 

// // error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });












// New- just for testing `register-push-token`
var createError = require('http-errors');

// catch 404 and forward to error handler
function notFoundHandler(req, res, next) {
  next(createError(404));
}

// error handler
function errorHandler(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // send JSON error response instead of trying to render a template
  res.status(err.status || 500);
  res.json({
    error: err.message,
    status: err.status || 500
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};