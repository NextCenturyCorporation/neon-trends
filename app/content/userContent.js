angular.module('neon-trends-content', ['infinite-scroll']).directive('content', function ($location, $anchorScroll) {
	return{
		restrict: 'E',
		templateUrl: "content/stream.html",
		scope: {
			initRange:"=range"
		},
		link:function(scope, element){
			var eventBus = new neon.eventing.EventBus();
			scope.entities = [];
			scope.last = 0;

			var entitiesMap ={};
			var range = scope.initRange;
			var selectedNode;
			scope.now = moment("2000-1-1");

			//$(element.parent()).height($(element.parent().siblings()[1]).height())


			eventBus.subscribe("onDataReturned", function(entities){
				entitiesMap = createMap(entities);
				//scope.entities = allEntities.slice(0,buffer);
				//scope.last = buffer;
				//scope.$apply();

			}, "content");

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
				scope.entities.length =0;
				angular.forEach(node.content, function(id){
					scope.entities.push(entitiesMap[id]);
				});

				scope.$apply();

			}, "content");

			eventBus.subscribe("LinkSelected", function (node) {
				scope.entities.length =0;
				angular.forEach(node.content, function(id){
					scope.entities.push(entitiesMap[id]);
				});
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