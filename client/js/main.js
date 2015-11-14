(function(){
	'use strict';
	var app = angular.module('app', ['ui.bootstrap', 'ngAnimate', 'webcam']);
	var SERVER_URL = 'http://localhost:8080/';
	var TAB_LOGIN = 'LOGIN', TAB_REGISTER = 'REGISTER';
	app.controller('MainCtrl', ['$scope', '$http', function($scope, $http) {
		var _video = null, patData = null;
		$scope.activeTab = TAB_LOGIN;
		$scope.patOpts = {x: 0, y: 0, w: 25, h: 25};
		$scope.channel = {
			width: 320,
			height: 240,
			video: null
		};

		// switch tabs
		$scope.showLoginTab = function() {
			$scope.activeTab = TAB_LOGIN;
		};
		$scope.showRegisterTab = function() {
			$scope.activeTab = TAB_REGISTER;
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

				patCanvas.width = _video.width;
				patCanvas.height = _video.height;
				var ctxPat = patCanvas.getContext('2d');

				var idata = getVideoData($scope.patOpts.x, $scope.patOpts.y, $scope.patOpts.w, $scope.patOpts.h);
				ctxPat.putImageData(idata, 0, 0);

				sendSnapshotToServer(patCanvas.toDataURL());

				patData = idata;
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

		var sendSnapshotToServer = function sendSnapshotToServer(data) {
			console.log(data);
		}
	}]);
})();
