var mysql = require('mysql');

// Database configurationn.
var config = {
	host: 'localhost',
	user: 'face',
	password: 'password',
	database: 'face',
	timezone: 'utc',
	connectionLimit: 10
};

// Establish a pooled connection.
var pool = mysql.createPool(config);
pool.on('close', function(err) {
	if (err)  // unexpected closing, reconnect
		pool = mysql.createPool(config);
	else  // expected closing
		console.log('Connection closed normally.');
});

// Use the specified database.
pool.query('USE ' + config.database);

// Export the pooled connection.
exports.pool = pool;
