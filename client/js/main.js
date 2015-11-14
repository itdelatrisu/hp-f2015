(function(){
	'use strict';
	var app = angular.module('app', ['ui.bootstrap', 'ngAnimate', 'webcam']);

	var SERVER_URL = 'http://localhost:8080/';
	var REGISTER_URL = SERVER_URL + 'register';
	var AUTH_URL = SERVER_URL + 'authenticate';
	var CHECK_USER_URL = SERVER_URL + 'checkUser';

	var TAB_LOGIN = 'LOGIN',
	    TAB_REGISTER = 'REGISTER';

	app.controller('MainCtrl', ['$scope', '$http', function($scope, $http) {
		$scope.activeTab = TAB_LOGIN;
		$scope.buttonDisabled = true;
		$scope.videoOn = false;
		$scope.videoLoaded = false;
		$scope.snapshotTaken = false;

		var _video = null, patData = null, imageData = null;
		$scope.patOpts = {x: 0, y: 0, w: 25, h: 25};
		$scope.channel = {
			width: 320,
			height: 240,
			video: null
		};

		// switch tabs
		function tabReset() {
			patData = imageData = null;
			$scope.login_username = $scope.register_username = '';
			$scope.buttonDisabled = true;
			$scope.videoOn = $scope.videoLoaded = $scope.snapshotTaken = false;
		}
		$scope.showLoginTab = function() {
			tabReset();
			$scope.activeTab = TAB_LOGIN;
		};
		$scope.showRegisterTab = function() {
			tabReset();
			$scope.activeTab = TAB_REGISTER;
		};

		// check if username field is valid
		$scope.checkUser = function(username, activeTab) {
			if (!username || username.length < 3) {
				$scope.buttonDisabled = true;
				return;
			}
			var url = CHECK_USER_URL + '?username=' + username;
			$http.get(url).success(function(data, status, headers, config) {
				if (activeTab === TAB_LOGIN)
					$scope.buttonDisabled = !data;  // username is in use
				else
					$scope.buttonDisabled = !!data;  // username is available
			});
		};

		// open video
		$scope.openVideo = function() {
			$scope.videoOn = true;
		};

		// submit form
		$scope.doLogin = function() {
			var postData = {
				'username': $scope.login_username,
				'image': imageData
			};
			console.log(postData);
			$http.post(AUTH_URL, postData).success(function(data, status, headers, config) {
				console.log(data);
				if (data.status === 0) {
					console.log('Success!');
				} else {
					console.log('Failure:');
					console.log(data.message);
				}
			});
		};
		$scope.doRegister = function() {
			var postData = {
				'username': $scope.register_username,
				'image': imageData
			};
			console.log(postData);
			$http.post(REGISTER_URL, postData).success(function(data, status, headers, config) {
				if (data.status === 0) {
					console.log('Success!');
				} else {
					console.log('Failure:');
					console.log(data.message);
				}
			});
		};

		// webcam stuff
		$scope.webcamError = false;
		$scope.onError = function (err) {
			$scope.$apply(
				function() {
					$scope.webcamError = err;
				}
			);
		};
		$scope.onSuccess = function() {
			// The video element contains the captured camera data
			_video = $scope.channel.video;
			$scope.videoLoaded = true;
			$scope.$apply(function() {
				$scope.patOpts.w = _video.width;
				$scope.patOpts.h = _video.height;
				$scope.showDemos = true;
			});
		};
		$scope.onStream = function(stream) {
			// You could do something manually with the stream.
		};
		// Make a snapshot of the camera data and show it in another canvas.
		$scope.makeSnapshot = function makeSnapshot() {
			if (_video) {
				var patCanvas = document.querySelector('#snapshot');
				if (!patCanvas) return;
				var ctxPat = patCanvas.getContext('2d');

				if ($scope.snapshotTaken) {
					ctxPat.clearRect(0, 0, _video.width, _video.height);
					$scope.snapshotTaken = false;
				} else {
					patCanvas.width = _video.width;
					patCanvas.height = _video.height;
					var idata = getVideoData($scope.patOpts.x, $scope.patOpts.y, $scope.patOpts.w, $scope.patOpts.h);
					ctxPat.putImageData(idata, 0, 0);
					imageData = patCanvas.toDataURL();
					patData = idata;
					$scope.snapshotTaken = true;
				}
			}
		};
		var getVideoData = function getVideoData(x, y, w, h) {
			var hiddenCanvas = document.createElement('canvas');
			hiddenCanvas.width = _video.width;
			hiddenCanvas.height = _video.height;
			var ctx = hiddenCanvas.getContext('2d');
			ctx.drawImage(_video, 0, 0, _video.width, _video.height);
			return ctx.getImageData(x, y, w, h);
		};
	}]);
})();
