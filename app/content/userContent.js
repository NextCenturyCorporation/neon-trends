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
			var buffer = 25;
			var bucket = {};
			var entitiesMap ={};
			var timeMap = {};
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

			eventBus.subscribe("timeBucket", function (obj) {
				/*
				bucket = obj;
				var size = Math.floor(moment(range.endDate).diff(moment(range.startDate)) / moment.duration(bucket.unitCount, bucket.intervalUnit));
				timeMap = new Array(size);
				var lastIndex =-1;
				var lastI =0;
				var j = 0;
				var index;
				for(var i= 0, l=allEntities.length; i<l;i++){
					var index = Math.floor(moment(allEntities[i].time).diff(moment(range.startDate)) / moment.duration(bucket.unitCount, bucket.intervalUnit));
					if(index > lastIndex){
						while(j<=index){
							timeMap[j]=lastI;
							j++;
						}
						lastIndex = index;
						lastI = i;
					}
				}
				while(j<size){
					timeMap[j]=lastI;
					j++;
				}
				*/
			}, "content");

			eventBus.subscribe("NodeSelected", function (node) {
				scope.entities = entitiesMap[node.id];
				selectedNode = node.id;
				scope.$apply();

			}, "content");

			scope.loadMore = function() {
				if(selectedNode){
					scope.entities = scope.entities.concat(entitiesMap[selectedNode].slice(scope.last,scope.last+buffer));
					scope.last +=buffer;
				}
			};
			scope.moment = moment;


			function createMap(entities){
				var map = {};
				angular.forEach(entities, function(entity){
					if(!map[entity.id]){
						map[entity.id] = [];
					}
					map[entity.id].push(entity);
				});

				return map;
			}


		}
	}
});