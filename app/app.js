angular.module('neon-trends', ['neon-trends-search', 'ngRoute', 'neon', 'neon-trends-timeline', 'neon-trends-content', 'neon-trends-filter', 'neon-trends-node']).config(['$routeProvider', function ($routeProvider) {

	$routeProvider.when('/dashboard', {
		templateUrl: 'dashboard/dashboard.html',
		controller: 'DashboardController',
		reloadOnSearch: false
	}).otherwise({redirectTo: '/dashboard'});
}]).run(function ($rootScope) {
	$.getJSON("config.json", function (data) {
		$rootScope.connection = {
			database: data.database,
			collection: data.collection
		}
	});
});

angular.module('neon-trends-timeline', []);
angular.module('neon-trends-node', []);
angular.module('neon-trends-search', ['neon', 'neon-trends-calendar']);


