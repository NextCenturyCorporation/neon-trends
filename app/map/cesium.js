angular.module('cesium').directive('cesium', function () {
	return{
		restrict: 'E',
		scope:{
			viewer: "="
		},
		link: function (scope, element, attrs, controllers) {

			var eventBus = new neon.eventing.EventBus();

			var viewer = new Cesium.Viewer(element[0],{
				animation:false,
				baseLayerPicker: false,
				fullscreenButton: false,
				homeButton: false,
				geocoder: false,
				infoBox: false,
				sceneModePicker: false,
				timeline: false,
				navigationHelpButton: false,
				navigationInstructionsInitiallyVisible: false,
				sceneMode: Cesium.SceneMode.COLUMBUS_VIEW

			});

			scope.viewer = viewer;


			var events = new Cesium.ScreenSpaceEventHandler(element[0]);
			events.setInputAction(function(click) {
				pickedObjects = viewer.scene.drillPick(Cesium.Cartesian2.clone(click.position));
				var entities = [];
				angular.forEach(pickedObjects, function (picked){
					entities.push(Cesium.defaultValue(picked.id, picked.primitive.id));
				});
				eventBus.publish("entity", entities, "map");
			}, Cesium.ScreenSpaceEventType.LEFT_CLICK);



			eventBus.subscribe("addEntity", function(entity){
				viewer.entities.add(entity);

			}, "map");

			eventBus.subscribe("addArc", function(pair){
				var startEntity = pair.start,
					endEntities= pair.end,
					color = pair.color;


				var earth = Cesium.Ellipsoid.WGS84;
				var height = 500000;
				// start and end points on the surface of the earth
				var startPoint = startEntity.position;

				angular.forEach(endEntities, function(endEntity){
					var entity = new Cesium.Entity();

					var endPoint = endEntity.position;

					// determine the midpoint (point will be inside the earth)
					var addCartesian = startPoint.clone();
					Cesium.Cartesian3.add(startPoint, endPoint, addCartesian);
					var midpointCartesian = addCartesian.clone();
					Cesium.Cartesian3.divideByScalar(addCartesian, 2, midpointCartesian);

					// move the midpoint to the surface of the earth
					earth.scaleToGeodeticSurface(midpointCartesian);

					// add some altitude if you want (1000 km in this case)
					var midpointCartographic = earth.cartesianToCartographic(midpointCartesian);
					midpointCartographic.height = height;
					midpointCartesian = earth.cartographicToCartesian(midpointCartographic);

					var spline = new Cesium.CatmullRomSpline({
						times: [0.0, 0.5, 1.0],
						points: [
							startPoint,
							midpointCartesian,
							endPoint
						]
						//firstTangent:startPoint,
						//lastTangent:endPoint
					});
					var polylinePoints = [];

					for (var ii = 0; ii < 30; ++ii) {
						polylinePoints.push(spline.evaluate(ii / 30));
					}

					entity.polyline = {
						positions: polylinePoints,
						width: 3,
						material: new Cesium.PolylineGlowMaterialProperty({
							glowPower: 0.3,
							color: color
						})
					};
					viewer.entities.add(entity);
				})

			}, "map");

			eventBus.subscribe("clearEntities", function(){
				viewer.entities.removeAll();
			}, "map");
			eventBus.subscribe("clearPrimitives", function(){
				viewer.scene.primitives.removeAll();
			}, "map");
		}


	}
});
