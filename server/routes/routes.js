var app = require('../app');
var pool = require('../config/database').pool;
var api = require('../config/api');
var key = api.faceAPIkey;
var fs = require('fs');
var IMG_DIR = 'img/';

module.exports = function(app) {
	app.get('/test', function(req, res) {
		var queryString = 'SELECT * FROM `users`';
		pool.query(queryString, function(err, results) {
			if (err) {
				sendSQLError(res, err);
				return;
			}
			res.json(results);
		});
	});

	// Checks if a username is in use.
	// Parameters: username (string)
	// Returns: true if in use, false if available
	app.get('/checkUser', function(req, res) {
		if (!req.query.hasOwnProperty('username')) {
			res.json(true);
			return;
		}
		var username = req.query.username;
		var queryString = 'SELECT 1 FROM `users` WHERE `username` = ?';
		pool.query(queryString, [username], function(err, results) {
			if (err) {
				res.json(true);
				return;
			}
			res.json(!!results.length);
		});
	});

	// Register a new account.
	// Parameters: username (string), files (base64 png image)
	app.post('/register', function(req, res) {
		var postData = req.body;
		if (!postData.hasOwnProperty('username') || !postData.hasOwnProperty('image')) {
			sendResponse(res, ERROR, 'Missing required field.');
			return;
		}

		// TODO: validate image and username
		var username = postData.username;
		var image = postData.image;

		// check if user exists
		var queryString = 'SELECT 1 FROM `users` WHERE `username` = ?';
		pool.query(queryString, [username], function(err, results) {
			if (err) {
				sendSQLError(res, err);
				return;
			}
			if (results.length) {
				sendResponse(res, ERROR, 'That\'s already been taken, sorry!');
				return;
			}

			// send to API and get face ID
			// TODO
			var faceId = 'TODO';

			// insert into database
			queryString = 'INSERT INTO `users` (`username`,`faceId`,`expiration`) VALUES(?, ?, NOW() + INTERVAL 1 DAY)';
			pool.query(queryString, [username, faceId], function(err, results) {
				if (err) {
					sendSQLError(res, err);
					return;
				}
				if (results.length) {
					sendResponse(res, ERROR, 'That\'s already been taken, sorry!');
					return;
				}
				var userId = results.insertId;

				// save photo to disk
				var base64Data = image.replace(/^data:image\/png;base64,/, '');
				fs.writeFile(IMG_DIR + userId + '.png', base64Data, 'base64', function(err) {
					if (err) {
						console.log(err);
						sendResponse(res, ERROR, 'The image could not be saved.');
					}
				});

				console.log('Registered new user ' + userId + ' (' + username +')');
				sendResponse(res, SUCCESS, '');
			});
		});
	});

	// Authenticates a user.
	// Parameters: username (string), files (image file)
	app.post('/authenticate', function(req, res) {
		var postData = req.body;
		// TODO
	});

	// Return a 404 error.
	app.use(function(req, res, next) {
		res.status(404).send('404 Not Found');
	});
};

var SUCCESS = 0, ERROR = 1;

// Sends a JSON response with the given status and message.
function sendResponse(res, status, message) {
	var data = { status: status };
	if (status === ERROR)
		data.message = message;
	res.json(data);
}

// Sends a JSON response with the given error, and logs the error.
function sendSQLError(res, err) {
	sendResponse(res, ERROR, '(SQL error) ' + err);
}
