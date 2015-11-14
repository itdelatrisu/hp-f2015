// core
var express = require('express');
var http = require('http');
var fs = require('fs');
var path = require('path');

// express middleware
var flash = require('connect-flash');
var cookieParser = require('cookie-parser');
var favicon = require('serve-favicon');
var logger = require('morgan');
var methodOverride = require('method-override');
var session = require('express-session');
var bodyParser = require('body-parser');
var multer = require('multer');
var errorHandler = require('errorhandler');
var json = require('json');
var urlencode = require('urlencode');
var compression = require('compression');

// express setup
var app = express();
var port = 8080; //process.env.PORT || 8080;
app.disable('x-powered-by');
app.use(compression());
app.use(logger('dev'));
app.use(cookieParser());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// enable CORS
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
	res.header("Access-Control-Allow-Headers", "Authorization, Origin, X-Requested-With, Content-Type, Accept");

	// intercept OPTIONS method
	if ('OPTIONS' == req.method)
		res.sendStatus(200);
	else
		next();
});

// route requests
require('./routes/routes.js')(app);

// http
var server = http.createServer(app);
server.listen(port);
console.log('Listening on port ' + port + '.');
