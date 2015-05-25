angular.module('neon-trends-filter', ['daterangepicker']).directive('filter', function () {
	return{
		restrict: 'E',
		templateUrl: "filters/filters.html",
		scope: {
			initRange:"=range"
		},
		link:function(scope){
			var eventBus = new neon.eventing.EventBus();
			scope.range = {};


			var eventBus = new neon.eventing.EventBus();
			scope.$watch(function(){
				return scope.range;
			}, function(newValue, oldValue){
				eventBus.publish("createdTemporalFilter",  scope.range, "daterange");
			})

			eventBus.subscribe("resetFilters", function () {
				init();
			}, "daterange");



			function init(){
				var now = (moment().format('YYYY/MM/DD 00:00'));
				var startRange = (moment().subtract(45, 'days').format('YYYY/MM/DD 00:00'));
				scope.range = scope.initRange;
			};

			init();


		}
	}
});