angular.module('neon-trends-search').directive('daterange', function () {
	return{
		restrict: 'E',
		templateUrl: "search/daterange.html",
		scope: {
		},
		link: function (scope, element, attrs, controllers) {
			scope.range = {
				start: undefined,
				end: undefined
			};



		}}
});