var faceAPIkey = '1561097d9a6444f1b5398227ab65cf1e';
var detect = 'https://api.projectoxford.ai/face/v0/detections';
var detectOptions = {
	url: detect,
	method: 'POST',
	headers: {
		'Content-Type': 'application/octet-stream',
		'Ocp-Apim-Subscription-Key': faceAPIkey
	}
}
var verify = 'https://api.projectoxford.ai/face/v0/verifications';

exports.faceAPIkey = faceAPIkey;
exports.detect = detect;
exports.detectOptions = detectOptions;
exports.verify = verify;
