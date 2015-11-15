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
				var queryString = 'INSERT INTO `users` (`username`,`faceId`,`faceIdExpiration`) VALUES(?, ?, NOW() + INTERVAL 1 DAY)';
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

	// Generates random head pose parameters (roll, yaw, pitch) for authentication.
	// These are temporary and expire immediately upon successful login.
	// Parameters: username (string)
	// Returns:
	//   {'status': 0, 'pitch': number, 'roll': number, 'yaw': number} on success
	//   {'status': 1, 'message': string} on error
	app.get('/authParams', function(req, res) {
		if (!req.query.hasOwnProperty('username')) {
			sendResponse(res, ERROR, 'Missing required field.');
			return;
		}
		var username = req.query.username;
		var queryString = 'SELECT `pitch`,`roll`,`yaw`,`authExpiration`,(`authExpiration` <= NOW()) AS expired FROM `users` WHERE `username` = ?';
		pool.query(queryString, [username], function(err, results) {
			if (err) {
				sendSQLError(res, err);
				return;
			}
			if (!results.length) {
				sendResponse(res, ERROR, 'That user doesn\'t exist!');
				return;
			}

			// use previous parameters if non-expired
			if (results[0].authExpiration && !results[0].expired) {
				res.json({
					status: SUCCESS,
					pitch: results[0].pitch,
					roll: results[0].roll,
					yaw: results[0].yaw
				});
				return;
			}

			// roll new parameters
			var pitch = 0.0;  // not implemented by microsoft :)
			var roll = -30.0 + Math.random() * 60.0;
			var yaw = (10.0 + Math.random() * 10.0) * ((Math.random() < 0.5) ? 1 : -1);
			pitch = parseFloat(pitch.toFixed(1));
			roll = parseFloat(roll.toFixed(1));
			yaw = parseFloat(yaw.toFixed(1));
			queryString = 'UPDATE `users` SET `pitch` = ?,`roll` = ?,`yaw` = ?,`authExpiration` = NOW() + INTERVAL 1 MINUTE WHERE `username` = ?';
			pool.query(queryString, [pitch, roll, yaw, username], function(err, results) {
				if (err) {
					sendSQLError(res, err);
					return;
				}
				res.json({
					status: SUCCESS,
					pitch: pitch,
					roll: roll,
					yaw: yaw
				});
			});
		});
	});

	// Authenticates a user.
	// Parameters: username (string), image (base64 png image)
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
		var queryString = 'SELECT *,(`faceIdExpiration` <= NOW()) AS faceIdExpired,(`authExpiration` <= NOW()) AS authExpired FROM `users` WHERE `username` = ?';
		pool.query(queryString, [username], function(err, results) {
			if (err) {
				sendSQLError(res, err);
				return;
			}
			if (!results.length) {
				sendResponse(res, ERROR, 'That user doesn\'t exist!');
				return;
			}
			if (results[0].authExpired) {
				sendResponse(res, ERROR, 'The head pose expired. Please refresh the page.');
				return;
			}
			if (!results[0].authExpiration) {
				sendResponse(res, ERROR, 'You must first generate head pose parameters.');
				return;
			}
			var userId = results[0].id;
			var faceId = results[0].faceId;
			var faceIdExpired = results[0].faceIdExpired;
			var targetPitch = results[0].pitch;
			var targetRoll = results[0].roll;
			var targetYaw = results[0].yaw;

			function compareFaces(faceId1) {
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
						sendResponse(res, ERROR, 'There was a problem detecting face.');
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
						if (!body.isIdentical) {
							sendResponse(res, ERROR, 'Faces do not match.');
							return;
						}

						// check head pose against target parameters
						var pitch = arr[0].attributes.headPose.pitch;
						var roll = arr[0].attributes.headPose.roll;
						var yaw = arr[0].attributes.headPose.yaw;
						//if (Math.abs(targetPitch - pitch) > ?)  // not implemented
						if (Math.abs(targetRoll - roll) > 5) {
							sendResponse(res, ERROR, 'Roll ' + roll + ' too far from target value (' + targetRoll + ').');
							return;
						}
						if (Math.abs(targetYaw - yaw) > 6) {
							sendResponse(res, ERROR, 'Yaw ' + yaw + ' too far from target value (' + targetYaw + ').');
							return;
						}

						// successful authentication: expire the auth parameters
						var queryString = 'UPDATE `users` SET `authExpiration` = NULL WHERE `username` = ?';
						pool.query(queryString, [username], function(err, results) {});

						res.json({status: SUCCESS, isIdentical: body.isIdentical, confidence: body.confidence});
					});
				});
			}

			// use existing face id
			if (!faceIdExpired) {
				compareFaces(faceId);
				return;
			}

			// generate a new face ID
			// read photo from disk
			fs.readFile(IMG_DIR + userId + '.png', function(err, data) {
				if (err) {
					console.log(err);
					sendResponse(res, ERROR, 'The reference image could not be loaded.');
				}

				// call API and get face ID
				api.faceDetect(data, function(error, response, body) {
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
					faceId = arr[0].faceId;
					queryString = 'UPDATE `users` SET `faceId` = ?,`faceIdExpiration` = NOW() + INTERVAL 1 DAY WHERE `id` = ?';
					pool.query(queryString, [faceId, userId], function(err, results) {
						if (err) {
							sendSQLError(res, err);
							return;
						}
						console.log('Renewed face ID for user ' + userId + ' (' + username +')');
						compareFaces(faceId);
					});
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
