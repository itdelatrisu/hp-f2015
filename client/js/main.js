(function(){
	'use strict';
	var app = angular.module('app', ['ui.bootstrap', 'ngAnimate', 'webcam']);

	var SERVER_URL = 'http://localhost:8080/';
	var REGISTER_URL = SERVER_URL + 'register';
	var CHECK_USER_URL = SERVER_URL + 'checkUser';
	var AUTH1_URL = SERVER_URL + 'auth1';
	var AUTH2_URL = SERVER_URL + 'auth2';

	var TAB_LOGIN = 'LOGIN',
	    TAB_REGISTER = 'REGISTER';

	app.controller('WelcomeCtrl', ['$scope', '$http', '$rootScope', function($scope, $http, $rootScope) {
		$rootScope.noLogin = false;
		$scope.$on('loginEvent', function(event, login_username) {
			$scope.login_username = login_username;
		});
	}]);

	app.controller('MainCtrl', ['$scope', '$http', '$rootScope', '$modal', '$timeout', function($scope, $http, $rootScope, $modal, $timeout) {
		$scope.activeTab = TAB_LOGIN;
		$scope.buttonDisabled = true;
		$scope.videoOn = false;
		$scope.videoLoaded = false;
		$scope.snapshotTaken = false;
		$scope.loginError = null;
		$rootScope.noLogin = false;

		var _video = null, patData = null, imageData = null;
		$scope.patOpts = {x: 0, y: 0, w: 25, h: 25};
		$scope.channel = {
			width: 320,
			height: 240,
			video: null
		};

		var modal = null;
		function openModal() {
			if (modal)
				return;
			modal = $modal.open({
				animation: false,
				templateUrl: 'spinner.html',
				backdrop: 'static',
				keyboard: false
			});
		};
		function closeModal() {
			if (modal) {
				modal.close();
				modal = null;
			}
		}

		// switch tabs
		function tabReset() {
			patData = imageData = null;
			$scope.login_username = $scope.register_username = '';
			$scope.buttonDisabled = true;
			$scope.videoOn = $scope.videoLoaded = $scope.snapshotTaken = false;
			$scope.submitDisabled = false;
			$scope.loginError = null;
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
		$scope.openVideo = function(isLogin) {
			$scope.submitDisabled = false;
			$scope.videoOn = true;
			$scope.registered = false;
			if (isLogin)
				$scope.initLogin = true;
		};

		// submit form
		$scope.doRegister = function() {
			$scope.submitDisabled = true;
			var postData = {
				'username': $scope.register_username,
				'image': imageData
			};
			console.log(postData);
			openModal();
			$http.post(REGISTER_URL, postData).success(function(data, status, headers, config) {
				closeModal();
				if (data.status === 0) {
					console.log('Success!');
					$scope.registered = true;
					$scope.registerFailed = false;
					$scope.activeTab = TAB_LOGIN;
					$scope.registered_username = $scope.register_username;
					tabReset();
				} else {
					console.log('Failure:');
					console.log(data.message);
					$scope.registered = false;
					$scope.registerFailed = true;
					$scope.submitDisabled = false;
				}
			});
		};

		$scope.closeRegisteredAlert = function() {
			$scope.registered = false;
			$scope.registerFailed = false;
		};
		$scope.closeLoginErrorAlert = function() {
			$scope.loginError = null;
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
			// makeScaryFace();
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
		$scope.beginLogin = function beginLogin() {
			if (_video) {
				$scope.loginError = false;
				var idata = getVideoData($scope.patOpts.x, $scope.patOpts.y, $scope.patOpts.w, $scope.patOpts.h);
				var hiddenCanvas = document.createElement('canvas');
				hiddenCanvas.width = _video.width;
				hiddenCanvas.height = _video.height;
				var ctx = hiddenCanvas.getContext('2d');
				ctx.putImageData(idata, 0, 0);
				imageData = hiddenCanvas.toDataURL();
				
				$scope.initLogin = false;
				$scope.initWait = true;
				
				$scope.submitDisabled = true;
				var postData = {
					'username': $scope.login_username,
					'image': imageData
				};
				console.log(postData);
				$http.post(AUTH1_URL, postData).success(function(data, status, headers, config) {
					console.log(data);
					if (data.status === 0) {
						console.log('Success!');
						$scope.initWait = false;
						$scope.initProg = true;
						switch(data.dir) {
							case 'N': $scope.eyeDirection = 'up'; break;
							case 'E': $scope.eyeDirection = 'right'; break;
							case 'S': $scope.eyeDirection = 'down'; break;
							case 'W': $scope.eyeDirection = 'left'; break;
						}
						
						$timeout(function() {
							var idata = getVideoData($scope.patOpts.x, $scope.patOpts.y, $scope.patOpts.w, $scope.patOpts.h);
							var hiddenCanvas = document.createElement('canvas');
							hiddenCanvas.width = _video.width;
							hiddenCanvas.height = _video.height;
							var ctx = hiddenCanvas.getContext('2d');
							ctx.putImageData(idata, 0, 0);
							imageData = hiddenCanvas.toDataURL();
							postData = {
								'nonce': data.nonce,
								'image': imageData
							};
							openModal();
							$http.post(AUTH2_URL, postData).success(function(data, status, headers, config) {
								closeModal();
								console.log(data);
								if (data.status === 0) {
									console.log('Success!');
									$rootScope.noLogin = true;
									$scope.loginError = null;
									$scope.$emit('loginEvent', $scope.login_username);
								} else {
									console.log('Failure:');
									console.log(data.message);
									$scope.submitDisabled = false;
									$scope.loginError = data.message;
									$scope.initLogin = true;
									$scope.initWait = false;
									$scope.initProg = false;
								}
							});
						}, 3000);
					} else {
						console.log('Failure:');
						console.log(data.message);
						$scope.submitDisabled = false;
						$scope.loginError = data.message;
						$scope.initLogin = true;
						$scope.initWait = false;
						$scope.initProg = false;
					}
				});
			}
		}
		// Make a snapshot of the camera data and show it in another canvas.
		$scope.makeSnapshot = function makeSnapshot() {
			if (_video) {
				var patCanvas = document.querySelector('#snapshot');
				if (!patCanvas) return;
				var ctxPat = patCanvas.getContext('2d');

				if ($scope.snapshotTaken) {
					ctxPat.clearRect(0, 0, _video.width, _video.height);
					$scope.snapshotTaken = false;
					$scope.registerFailed = false;
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
			ctx.scale(-1, 1);
			return ctx.getImageData(x, y, w, h);
		};
	}]);
})();
