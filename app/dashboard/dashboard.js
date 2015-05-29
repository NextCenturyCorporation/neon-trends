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

		if(entities.length) {
			var startEntity1;
			var startEntity2;
			var startEntity3;
			var endEntities1 = [];
			var endEntities2 = [];
			eventBus.publish("addEntities", entities, "dashboard");
			angular.forEach(entities, function (entity, key) {



				//code to add random connections
				if (key === 0) {
					startEntity1 = entity;
				}
				if (key === 1) {
					startEntity2 = entity;
				}
				if (key === 3) {
					startEntity3 = entity;
				}
				if (key % 13 === 0) {
					endEntities1.push(entity);
				}
				if (key % 14 === 0) {
					endEntities2.push(entity);
				}
			});



			eventBus.publish("addArc", {
				start: startEntity1,
				end: endEntities1,
				color: Cesium.Color.BLUE
			}, "dashboard");

			eventBus.publish("addArc", {
				start: startEntity2,
				end: endEntities2,
				color: Cesium.Color.CADETBLUE
			}, "dashboard");

			//$scope.$emit("addArc", startEntity1, endEntities1, Cesium.Color.BLUE)
			//$scope.$emit("addArc", startEntity2, endEntities2, Cesium.Color.CADETBLUE)

		}

	}
	$scope.timeData = [
		{time: 143043840000,volume: 54},
		{time: 143044200000,volume: 66},
		{time: 143044560000,volume: 77},
		{time: 143044920000,volume: 70},
		{time: 143045280000,volume: 60},
		{time: 143045640000,volume: 63},
		{time: 143046000000,volume: 55},
		{time: 143046360000,volume: 47},
		{time: 143046720000,volume: 55},
		{time: 143047080000,volume: 30}
	];
}]);