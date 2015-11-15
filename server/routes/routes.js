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

	// First-stage authentication for a user.
	// Parameters: username (string), image (base64 png image)
	// Returns:
	//   {'status': 0, 'dir': string, 'nonce': number} on success
	//   {'status': 1, 'message': string} on failure
	app.post('/auth1', function(req, res) {
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
		var queryString = 'SELECT `id`,`faceId`,(`faceIdExpiration` <= NOW()) AS faceIdExpired FROM `users` WHERE `username` = ?';
		pool.query(queryString, [username], function(err, results) {
			if (err) {
				sendSQLError(res, err);
				return;
			}
			if (!results.length) {
				sendResponse(res, ERROR, 'That user doesn\'t exist!');
				return;
			}
			var userId = results[0].id;
			var faceId = results[0].faceId;
			var faceIdExpired = results[0].faceIdExpired;

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

						// get target parameters
						var params = {
							pitch: arr[0].attributes.headPose.pitch,
							roll: arr[0].attributes.headPose.roll,
							yaw: arr[0].attributes.headPose.yaw,
							pupilLeft: arr[0].faceLandmarks.pupilLeft,
							pupilRight: arr[0].faceLandmarks.pupilRight,
							noseTip: arr[0].faceLandmarks.noseTip
						};

						// generate nonce and direction
						var nonce = Math.floor(Math.random() * (1 << 31 - 1));
						var dir = 'NSEW'.charAt(Math.floor(Math.random() * 4));

						// insert into database
						var queryString = 'INSERT INTO `auth` VALUES (?, ?, ?, ?, NOW() + INTERVAL 1 MINUTE)';
						pool.query(queryString, [userId, dir, nonce, JSON.stringify(params)], function(err, results) {});

						res.json({status: SUCCESS, dir: dir, nonce: nonce});
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

	// Second-stage authentication for a user.
	// Parameters: nonce (number), image (base64 png image)
	// Returns: {'status': 0|1, 'message': string}
	app.post('/auth2', function(req, res) {
		var postData = req.body;
		if (!postData.hasOwnProperty('nonce') || !postData.hasOwnProperty('image')) {
			sendResponse(res, ERROR, 'Missing required field.');
			return;
		}

		// TODO: validate image and nonce
		var nonce = postData.nonce;
		var image = postData.image;
		var imageDataBase64 = image.replace(/^data:image\/png;base64,/, '');
		var imageBuf = new Buffer(imageDataBase64, 'base64');

		// check if nonce exists
		var queryString = 'SELECT *,(`authExpiration` <= NOW()) AS authExpired FROM `auth` WHERE `nonce` = ?';
		pool.query(queryString, [nonce], function(err, results) {
			if (err) {
				sendSQLError(res, err);
				return;
			}
			if (!results.length) {
				sendResponse(res, ERROR, 'That nonce doesn\'t exist!');
				return;
			}
			var userId = results[0].id;
			var dir = results[0].dir;
			var params = JSON.parse(results[0].params);
			var authExpired = results[0].authExpired;

			// delete from database
			var queryString = 'DELETE FROM `auth` WHERE `nonce` = ?';
			pool.query(queryString, [nonce], function(err, results) {});

			// check for expiration
			if (authExpired) {
				sendResponse(res, ERROR, 'The request has expired. Please refresh the page.');
				return;
			}

			// get faceId
			queryString = 'SELECT `faceId`,(`faceIdExpiration` <= NOW()) AS faceIdExpired FROM `users` WHERE `id` = ?';
			pool.query(queryString, [userId], function(err, results) {
				if (err) {
					sendSQLError(res, err);
					return;
				}
				if (!results.length) {
					sendResponse(res, ERROR, 'That user doesn\'t exist!');
					return;
				}
				var faceId = results[0].faceId;
				var faceIdExpired = results[0].faceIdExpired;

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

							// compare target parameters
							var newParams = {
								pitch: arr[0].attributes.headPose.pitch,
								roll: arr[0].attributes.headPose.roll,
								yaw: arr[0].attributes.headPose.yaw,
								pupilLeft: arr[0].faceLandmarks.pupilLeft,
								pupilRight: arr[0].faceLandmarks.pupilRight,
								noseTip: arr[0].faceLandmarks.noseTip
							};
							console.log(params);
							console.log(newParams);
							//if (Math.abs(params.pitch - newParams.pitch) > ?)  // not implemented
							if (Math.abs(params.yaw - newParams.yaw) > 10) {
								sendResponse(res, ERROR, 'Please keep your head still and try again.');
								return;
							}
							if (Math.abs(params.roll - newParams.roll) > 3) {
								sendResponse(res, ERROR, 'Please keep your head still and try again.');
								return;
							}
							var dxLeft = (newParams.pupilLeft.x - newParams.noseTip.x) - (params.pupilLeft.x - params.noseTip.x);
							var dyLeft = (newParams.pupilLeft.y - newParams.noseTip.y) - (params.pupilLeft.y - params.noseTip.y);
							var dxRight = (newParams.pupilRight.x - newParams.noseTip.x) - (params.pupilRight.x - params.noseTip.x);
							var dyRight = (newParams.pupilRight.y - newParams.noseTip.y) - (params.pupilRight.y - params.noseTip.y);
							var angle1 = Math.atan2(dyLeft, dxLeft);
							var angle2 = Math.atan2(dyRight, dxRight);
							var angleAvg = (angle1 + angle2) / 2;
							console.log('angle1 = ' + angle1);
							console.log('angle2 = ' + angle2);
							console.log('angleAvg = ' + angleAvg);
							var angleTarget;
							if (dir == 'S') angleTarget = Math.PI / 2;
							else if (dir == 'N') angleTarget = -Math.PI / 2;
							else if (dir == 'W') angleTarget = 0;
							else {
								angleTarget = Math.PI;
								angleAvg = Math.abs(angleAvg);
							}
							console.log('angleTarget = ' + angleTarget);
							var threshold = 45 * Math.PI / 180;
							console.log('threshold = ' + threshold);
							console.log('diff = ' + Math.abs(angleTarget - angleAvg));
							if (Math.abs(angleTarget - angleAvg) > threshold) {
								sendResponse(res, ERROR, 'Please look in the specified direction with your eyes only.');
								return;
							}

							console.log('Successfully authenticated.');
							sendResponse(res, SUCCESS, '');
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
