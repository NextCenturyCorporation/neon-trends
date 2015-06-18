angular.module('neon-trends').controller('DashboardController', ["$scope", "Connection",function($scope, Connection){
	var eventBus = new neon.eventing.EventBus();
	//hard coded interesting timeframe for now
		
	var now = (moment('2015/01/12').format('YYYY/MM/DD 09:00'));
	var start = (moment('2015/01/11').format('YYYY/MM/DD 00:00'));

	$scope.range = {
		startDate:start,
		endDate:now
	};



	$scope.onResults = function(entities){

		eventBus.publish("updateTimeline",  entities, "dashboard");



	}

}]);