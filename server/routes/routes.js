var app = require('../app');
var pool = require('../config/database').pool;

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
