var app = require('../app');
var pool = require('../config/database').pool;
var api = require('../config/api');
var fs = require('fs');
var IMG_DIR = 'img/';

module.exports = function(app) {
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
	// Parameters: username (string), image (base64 png image)
	// Returns: {'status': 0|1, 'message': string}
	app.post('/register', function(req, res) {
		var postData = req.body;
		if (!postData.hasOwnProperty('username') || !postData.hasOwnProperty('image')) {
			sendResponse(res, ERROR, 'Missing required field.');
			return;
		}

		// TODO: validate image and username
		var username = postData.username;
		var image = postData.image;
		var imageDataBase64 = image.replace(/^data:image\/png;base64,/, '');
		var imageBuf = new Buffer(imageDataBase64, 'base64');

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

			// insert into database
			function insert(faceId) {
				var queryString = 'INSERT INTO `users` (`username`,`faceId`,`expiration`) VALUES(?, ?, NOW() + INTERVAL 1 DAY)';
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
					fs.writeFile(IMG_DIR + userId + '.png', imageDataBase64, 'base64', function(err) {
						if (err) {
							console.log(err);
							sendResponse(res, ERROR, 'The image could not be saved.');
						}
					});

					console.log('Registered new user ' + userId + ' (' + username +')');
					sendResponse(res, SUCCESS, '');
				});
			}

			// call API and get face ID
			api.faceDetect(imageBuf, function(error, response, body) {
				if (error) {
					sendResponse(res, ERROR, 'API call failed.');
					return;
				}
				if (response.statusCode != 200) {
					sendResponse(res, ERROR, 'API call returned status code ' + response.statusCode + ': ' + body);
					return;
				}
				console.log(body);
				var arr = JSON.parse(body);
				if (!Array.isArray(arr) || arr.length != 1) {
					sendResponse(res, ERROR, 'API call returned unexpected value: ' + body);
					return;
				}
				var faceId = arr[0].faceId;
				insert(faceId);
			});
		});
	});

	// TODO generate random headPose (roll/yaw/pitch) parameters


	// Authenticates a user.
	// Parameters: username (string), files (base64 png image)
	// Returns:
	//   {'status': 0, 'isIdentical': boolean, 'confidence': number} on success
	//   {'status': 1, 'message': string} on error
	app.post('/authenticate', function(req, res) {
		var postData = req.body;
		if (!postData.hasOwnProperty('username') || !postData.hasOwnProperty('image')) {
			sendResponse(res, ERROR, 'Missing required field.');
			return;
		}

		// TODO: validate image and username
		var username = postData.username;
		var image = postData.image;
		var imageDataBase64 = image.replace(/^data:image\/png;base64,/, '');
		var imageBuf = new Buffer(imageDataBase64, 'base64');

		// check if user exists
		var queryString = 'SELECT `faceId`,(`expiration` >= NOW()) AS expired FROM `users` WHERE `username` = ?';
		pool.query(queryString, [username], function(err, results) {
			if (err) {
				sendSQLError(res, err);
				return;
			}
			if (!results.length) {
				sendResponse(res, ERROR, 'That user doesn\'t exist!');
				return;
			}

			// generate a new face ID
			if (results[0].expired) {
				// TODO
			}

			var faceId1 = results[0].faceId;

			// call API and get face ID
			api.faceDetect(imageBuf, function(error, response, body) {
				if (error) {
					sendResponse(res, ERROR, 'API call failed.');
					return;
				}
				if (response.statusCode != 200) {
					sendResponse(res, ERROR, 'API call returned status code ' + response.statusCode + ': ' + body);
					return;
				}
				console.log(body);
				var arr = JSON.parse(body);
				if (!Array.isArray(arr) || arr.length != 1) {
					sendResponse(res, ERROR, 'API call returned unexpected value: ' + body);
					return;
				}
				var faceId2 = arr[0].faceId;

				// call API and verify IDs
				api.verify(faceId1, faceId2, function(error, response, body) {
					if (error) {
						sendResponse(res, ERROR, 'API call failed.');
						return;
					}
					if (response.statusCode != 200) {
						sendResponse(res, ERROR, 'API call returned status code ' + response.statusCode + ': ' + JSON.stringify(body));
						return;
					}
					console.log(body);
					res.json({status: SUCCESS, isIdentical: body.isIdentical, confidence: body.confidence});
				});
			});
		});
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
