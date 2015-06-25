angular.module('neon-trends-content', ['infinite-scroll']).directive('content', function ($location, $anchorScroll) {
	return{
		restrict: 'E',
		templateUrl: "content/stream.html",
		scope: {
			initRange:"=range",
			content:"=",
			conversations:"="

		},
		link:function(scope, element){
			var eventBus = new neon.eventing.EventBus();
			scope.entities = [];
			scope.last = 0;

			var entitiesMap ={};
			var range = scope.initRange;
			var selectedNode;
			scope.now = moment("2000-1-1");



			eventBus.subscribe("createdTemporalFilter", function (obj) {
				range = obj;
			}, "content");

			eventBus.subscribe("clearEntities", function () {
				scope.entities.length =0;

			}, "content");

			eventBus.subscribe("tick", function (range) {
				scope.now = range.start;
			}, "content");

			eventBus.subscribe("NodeSelected", function (node) {
				window.scrollTo(0,0);
				scope.entities.length =0;
				for (var id of node.conversations.keys()) {
					angular.forEach(scope.conversations[id], function(status_id){
						scope.entities.push(scope.content[status_id]);
					});
				}

				scope.$apply();

			}, "content");

			eventBus.subscribe("LinkSelected", function (link) {
				window.scrollTo(0,0);
				scope.entities.length =0;
				for (var id of link.conversations.keys()) {
					angular.forEach(scope.conversations[id], function(status_id){
						scope.entities.push(scope.content[status_id]);
					});
				}
				scope.$apply();

			}, "content");

			scope.moment = moment;


			function createMap(entities){
				var map = {};
				angular.forEach(entities, function(entity){
					map[entity.status_id] = entity;
				});

				return map;
			}


		}
	}
});