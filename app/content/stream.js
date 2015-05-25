angular.module('neon-trends-stream', ['infinite-scroll']).directive('stream', function ($location, $anchorScroll) {
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
			var allEntities =[];
			var timeMap = {};
			var range = scope.initRange;

			//$(element.parent()).height($(element.parent().siblings()[1]).height())


			eventBus.subscribe("onDataReturned", function(entities){
				allEntities = entities;
				scope.entities = allEntities.slice(0,buffer);
				scope.last = buffer;
				scope.$apply();

			}, "stream");

			eventBus.subscribe("createdTemporalFilter", function (obj) {
				range = obj;
			}, "stream");

			eventBus.subscribe("clearEntities", function () {
				scope.entities.length =0;

			}, "stream");

			eventBus.subscribe("tick", function (obj) {
				var j =Math.floor(moment(obj.start).diff(moment(range.startDate)) / moment.duration(bucket.unitCount, bucket.intervalUnit))
				var index = timeMap[j];
				// the next line is required to work around a bug in WebKit (Chrome / Safari)
				while(index > scope.last){
					scope.loadMore();
					scope.$apply();
				}
				//only animate every 10 steps, otherwise too choppy
				if(j % 10===0){
					if ($('#entity-' + index).length) {


					$('html, body').animate({
						scrollTop: $('#entity-' + index).offset().top - 95
					}, 1000);
					}
				}



			}, "stream");

			eventBus.subscribe("timeBucket", function (obj) {
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
			}, "stream");

			eventBus.subscribe("createdTemporalFilter", function (obj) {
				range = obj;
			}, "stream");

			scope.loadMore = function() {
				scope.entities = scope.entities.concat(allEntities.slice(scope.last,scope.last+buffer));
				scope.last +=buffer;
			};
			scope.moment = moment;
		}
	}
});