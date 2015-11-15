(function(){
	'use strict';
	var app = angular.module('app', ['ui.bootstrap', 'ngAnimate', 'webcam']);

	var SERVER_URL = 'http://localhost:8080/';
	var REGISTER_URL = SERVER_URL + 'register';
	var AUTH_URL = SERVER_URL + 'authenticate';
	var CHECK_USER_URL = SERVER_URL + 'checkUser';
	var AUTH_PARAMS_URL = SERVER_URL + 'authParams';
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

		var roll, pitch, yaw;
		// open video
		$scope.openVideo = function(isLogin) {
			$scope.submitDisabled = false;
			$scope.videoOn = true;
			$scope.registered = false;
			if (isLogin) {
				$scope.initLogin = true;
				// var username = $scope.login_username;
				// var url = AUTH_PARAMS_URL + '?username=' + username;
				// $http.get(url).success(function(data, status, headers, config) {
					// pitch = data.pitch;
					// yaw = -data.yaw;
					// roll = data.roll;
				// });
			}
		};

		// submit form
		$scope.doLogin = function() {
			$scope.submitDisabled = true;
			var postData = {
				'username': $scope.login_username,
				'image': imageData
			};
			console.log(postData);
			openModal();
			$http.post(AUTH_URL, postData).success(function(data, status, headers, config) {
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
				}
			});
		};
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
						}, 1500);
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
		
		var makeScaryFace = function makeScaryFace() {
			if (!Detector.webgl) Detector.addGetWebGLMessage();

			var container, loader;
			var camera, scene, renderer;
			var mesh;
			var composer, composerUV1, composerUV2, composerUV3, composerBeckmann;
			var material, composerScene, renderScene;
			var directionalLight, pointLight, ambientLight;

			var windowHalfX = 160;
			var windowHalfY = 120;

			var firstPass = true;

			init();
			animate();

			function init() {
				container = document.getElementById('scaryface');

				camera = new THREE.PerspectiveCamera(35, 320 / 240, 1, 10000);
				camera.position.z = 900;

				scene = new THREE.Scene();

				// LIGHTS

				directionalLight = new THREE.DirectionalLight(0xffeedd, 1.5);
				directionalLight.position.set(1, 0.5, 1);
				scene.add(directionalLight);

				directionalLight = new THREE.DirectionalLight(0xddddff, 0.5);
				directionalLight.position.set(-1, 0.5, -1);
				scene.add(directionalLight);

				// MATERIALS

				var diffuse = 0xbbbbbb, specular = 0x070707, shininess = 50;

				specular = 0x555555;

				var shader = THREE.ShaderSkin["skin"];

				var uniformsUV = THREE.UniformsUtils.clone(shader.uniforms);

				uniformsUV["tNormal"].value = THREE.ImageUtils.loadTexture("obj/leeperrysmith/Infinite-Level_02_Tangent_SmoothUV.jpg");
				uniformsUV["uNormalScale"].value = -1.5;

				uniformsUV["tDiffuse"].value = THREE.ImageUtils.loadTexture("obj/leeperrysmith/Map-COL.jpg");

				uniformsUV["passID"].value = 0;

				uniformsUV["diffuse"].value.setHex(diffuse);
				uniformsUV["specular"].value.setHex(specular);

				uniformsUV["uRoughness"].value = 0.185;
				uniformsUV["uSpecularBrightness"].value = 0.7;

				var uniforms = THREE.UniformsUtils.clone(uniformsUV);
				uniforms["tDiffuse"].value = uniformsUV["tDiffuse"].value;
				uniforms["tNormal"].value = uniformsUV["tNormal"].value;
				uniforms["passID"].value = 1;

				var parameters = { fragmentShader: shader.fragmentShader, vertexShader: shader.vertexShader, uniforms: uniforms, lights: true, derivatives: true };
				var parametersUV = { fragmentShader: shader.fragmentShader, vertexShader: shader.vertexShaderUV, uniforms: uniformsUV, lights: true, derivatives: true };

				material = new THREE.ShaderMaterial(parameters);
				var materialUV = new THREE.ShaderMaterial(parametersUV);

				// LOADER

				loader = new THREE.JSONLoader();
				loader.load( "obj/leeperrysmith/LeePerrySmith.js", function(geometry) { createScene(geometry, 100, material) });

				// RENDERER

				renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
				renderer.setClearColor(0, 0);
				renderer.setPixelRatio(window.devicePixelRatio);
				renderer.setSize(320, 240);
				renderer.autoClear = false;

				if (container) {
					container.appendChild(renderer.domElement);
				}

				// POSTPROCESSING

				var renderModelUV = new THREE.RenderPass(scene, camera, materialUV, new THREE.Color(0x575757));

				var effectCopy = new THREE.ShaderPass(THREE.CopyShader);

				var effectBloom1 = new THREE.BloomPass(1, 15, 2, 240);
				var effectBloom2 = new THREE.BloomPass(1, 25, 3, 240);
				var effectBloom3 = new THREE.BloomPass(1, 25, 4, 240);

				effectBloom1.clear = true;
				effectBloom2.clear = true;
				effectBloom3.clear = true;

				effectCopy.renderToScreen = true;

				//

				var pars = {
					minFilter: THREE.LinearMipmapLinearFilter,
					magFilter: THREE.LinearFilter,
					format: THREE.RGBFormat,
					stencilBuffer: false
				};

				var rtwidth = 240;
				var rtheight = 240;

				//

				composerScene = new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(rtwidth, rtheight, pars));
				composerScene.addPass(renderModelUV);

				renderScene = new THREE.TexturePass(composerScene.renderTarget2);

				//

				composerUV1 = new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(rtwidth, rtheight, pars));

				composerUV1.addPass(renderScene);
				composerUV1.addPass(effectBloom1);

				composerUV2 = new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(rtwidth, rtheight, pars));

				composerUV2.addPass(renderScene);
				composerUV2.addPass(effectBloom2);

				composerUV3 = new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(rtwidth, rtheight, pars));

				composerUV3.addPass(renderScene);
				composerUV3.addPass(effectBloom3);

				//

				var effectBeckmann = new THREE.ShaderPass(THREE.ShaderSkin["beckmann"]);
				composerBeckmann = new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(rtwidth, rtheight, pars));
				composerBeckmann.addPass(effectBeckmann);

				//

				uniforms["tBlur1"].value = composerScene.renderTarget2;
				uniforms["tBlur2"].value = composerUV1.renderTarget2;
				uniforms["tBlur3"].value = composerUV2.renderTarget2;
				uniforms["tBlur4"].value = composerUV3.renderTarget2;

				uniforms["tBeckmann"].value = composerBeckmann.renderTarget1;
			}

			function createScene(geometry, scale, material) {
				mesh = new THREE.Mesh(geometry, material);
				mesh.position.y = -50;
				mesh.scale.set(scale, scale, scale);

				scene.add(mesh);
			}

			function animate() {
				requestAnimationFrame(animate);
				render();
			}

			function render() {
				if (mesh) {
					mesh.rotation.y = yaw * Math.PI / 180;
					//mesh.rotation.y = 10 * Math.PI / 180;
					mesh.rotation.z = roll * Math.PI / 180;
					//mesh.rotation.x = pitch * Math.PI / 180;
				}

				renderer.clear();

				if (firstPass) {
					composerBeckmann.render();
					firstPass = false;
				}

				composerScene.render();

				composerUV1.render();
				composerUV2.render();
				composerUV3.render();

				renderer.render(scene, camera);
			}
		};
	}]);
})();
