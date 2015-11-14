var request = require('request');

// Face API key
var faceAPIkey = '1561097d9a6444f1b5398227ab65cf1e';

// Calls the face detect API.
// Parameters:
//   image    - Buffer
//   callback - function(error, response, body)
var faceDetect = function(image, callback) {
	var options = {
		url: 'https://api.projectoxford.ai/face/v0/detections?analyzesHeadPose=true',
		method: 'POST',
		body: image,
		headers: {
			'Content-Type': 'application/octet-stream',
			'Ocp-Apim-Subscription-Key': faceAPIkey
		}
	};
	request(options, callback);
};

// Calls the face verification API.
// Parameters:
//   faceId1  - string
//   faceId2  - string
//   callback - function(error, response, body)
var verify = function(faceId1, faceId2, callback) {
	var options = {
		url: 'https://api.projectoxford.ai/face/v0/verifications',
		method: 'POST',
		json: true,
		body: {
			'faceId1': faceId1,
			'faceId2': faceId2
		},
		headers: {
			'Ocp-Apim-Subscription-Key': faceAPIkey
		}
	};
	request(options, callback);
};

exports.faceDetect = faceDetect;
exports.verify = verify;
