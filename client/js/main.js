(function(){
	'use strict';
	var app = angular.module('app', ['ui.bootstrap', 'ngAnimate', 'webcam']);
	var SERVER_URL = 'http://localhost:8080/';
	var TAB_LOGIN = 'LOGIN', TAB_REGISTER = 'REGISTER';
	app.controller('MainCtrl', ['$scope', '$http', function($scope, $http) {
		$scope.activeTab = TAB_LOGIN;

		$scope.showLoginTab = function() {
			$scope.activeTab = TAB_LOGIN;
		};
		$scope.showRegisterTab = function() {
			$scope.activeTab = TAB_REGISTER;
		};
	}]);
})();
