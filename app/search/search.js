angular.module('neon-trends-search').directive('search', function (Connection, $rootScope) {
	return{
		restrict: 'E',
		templateUrl: "search/search.html",
		scope: {
			resultsHandler: '=',
			initRange:"=range"
		},
		link: function (scope, element, attrs, controllers) {

			model = $rootScope.model;

			scope.search = {};
			scope.search.q = {name: "", text: ""};
			scope.search.range = {};
			scope.search.range = scope.initRange;
			scope.search.clauses = {};
			var geoClause;
			var eventBus = new neon.eventing.EventBus();


			function getDescendantProp(obj, desc) {
				var arr = desc.split(".");
				while (obj && arr.length - 1) {
					obj = getValueFromObject(obj, arr.shift());
				}
				;

				return obj;
			}

			function getValueFromObject(object, key) {
				var obj = getDescendantProp(object, key);
				if (!obj) {
					return null;
				}
				var arr = key.split(".");
				var desc = arr[arr.length - 1];
				var m = key.match(/(\w+)\[(\d+)\]$/);

				if (m) {
					if (obj[m[1]]) {
						return obj[m[1]][+m[2]];
					} else {
						return null;
					}

				} else {
					return obj[desc];
				}

			}


			scope.clear = function () {
				eventBus.publish("clearEntities", {}, "search");
				eventBus.publish("resetFilters", {}, "search");
				eventBus.publish("clearPrimitives", {}, "search");
				scope.search.clauses = {};
				scope.search.q = {name: "", text: ""};
				geoClause = null;
				search();
			}


			eventBus.subscribe("createdExtentFilter", function (circle) {
				geoClause = neon.query.withinDistance("gnip.profileLocations.0.geo.coordinates", circle.center, circle.radius, neon.query.METER);
				search();
			}, "search");

			eventBus.subscribe("onClauseEdit", function (clause) {
				scope.search.q = clause;
			}, "search");

			eventBus.subscribe("createdTemporalFilter", function (range) {
				scope.search.range.startDate = range.startDate;
				scope.search.range.endDate = range.endDate;
				search();
			}, "search");

			eventBus.subscribe("onFilterChange", function (obj) {
				search();
			}, "search");

			eventBus.subscribe("onClauseRemove", function (key) {
				delete scope.search.clauses[key];
				search();
			}, "search");



			scope.addTerm = function () {
				if (scope.search.q.text) {
					if (scope.search.clauses[scope.search.q.name]) {
						scope.search.clauses[scope.search.q.name] = scope.search.q.text;
					} else {
						scope.search.clauses[scope.search.q.text] = scope.search.q.text;
					}
				}
				scope.search.q = {name: "", text: ""};
				search();
			}


			function search() {
				eventBus.publish("clearEntities", {}, "search");
				var where = neon.query.where;
				var and = neon.query.and;

				var textClauses = [];
				var clauses = [];


				var temporalClauses = [];


				if (Object.keys(scope.search.clauses).length) {
					angular.forEach(scope.search.clauses, function (clause) {
						var terms = clause.split(" ");
						var textClause = [];
						angular.forEach(terms, function (term) {
							if (term[0] === '#') {
								textClause.push(where(model.hashtags, "=", term.substring(1)));
							} else if (term[0] === '@') {
								textClause.push(where(model.handle, "=", term.substring(1)));
							} else {
								textClause.push(where(model.description, "contains", term));
							}

						});
						textClauses.push(neon.query.or(textClause));
					});

				}

				temporalClauses.push(neon.query.where(model.time, ">=", new Date(scope.search.range.startDate)));
				temporalClauses.push(neon.query.where(model.time, "<=", new Date(scope.search.range.endDate)));



				if (textClauses.length) {
					clauses.push(neon.query.and(textClauses));
				}
				if (temporalClauses.length) {
					clauses.push(neon.query.and(temporalClauses));
				}
				if (geoClause) {
					clauses.push(geoClause);
				}


				//neon doesn't support array indexes for getting fields, so you need to create aa placehold key as needed
				var queryAds = new neon.query.Query().withFields(Object.keys(model).map(function(k){return model[k]})).selectFrom($rootScope.connection.database, $rootScope.connection.collection).where(and(clauses)).limit(10000).sortBy(model.time, neon.query.ASCENDING);

				scope.search.q = {name: "", text: ""};
				Connection.executeQuery(queryAds, function (result) {
					var entities = [];
					var startPoint;
					angular.forEach(result.data, function (tweet) {
						var entity= {};
						angular.forEach(model, function(value, key) {
							entity[key] = getValueFromObject(tweet, value);
						});

						entity.time = moment(entity.time).toDate(),

						entities.push(entity);

					});


					eventBus.publish("onDataReturned", entities, "search");


					scope.resultsHandler(entities);


				});
			}
			search();
		}
	}
});