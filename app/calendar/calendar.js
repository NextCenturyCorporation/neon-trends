angular.module('neon-trends-calendar', []).directive('calendar', function (Connection) {
	return{
		restrict: 'A',
		scope:{
			ngModel:'='
		},
		link: function (scope, element, attrs, controllers) {
			$(element).datetimepicker();

			scope.$watch(function(){
				return $(element).val();
			}, function(newValue, oldValue){
				if(newValue !== oldValue){
					scope.ngModel = newValue;
				}
			});


		}
	}
});