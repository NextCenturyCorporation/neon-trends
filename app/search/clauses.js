angular.module('neon-trends-search').directive('clauses', function (Connection) {
	return{
		restrict: 'E',
		templateUrl: "search/clauses.html",
		scope:{
			clauses:'='
		},
		link: function (scope, element, attrs, controllers) {
			var eventBus = new neon.eventing.EventBus();
			scope.edit = function(clause){
				eventBus.publish("onClauseEdit", clause, "clauses");
			}
			scope.remove = function(key){
				eventBus.publish("onClauseRemove", key, "clauses");
			}

		}
	}
});