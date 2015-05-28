angular.module('openlayers', []).directive('openlayers', function (Connection) {
	return{
		restrict: 'A',
		scope: {
			map:"=",
			source: '=',
			initRange: '=range'
		},
		link: function (scope, element, attrs, controllers) {
			var eventBus = new neon.eventing.EventBus();
			var layers = [];
			var bucket = {intervalUnit: "minute",
							unitCount: 5};
			var raster = new ol.layer.Tile({
				source: new ol.source.OSM()
			});

			var range = scope.initRange;

			eventBus.subscribe("createdTemporalFilter", function (obj) {
				range = obj;
			}, "map");



			var timeMap = null;

			var source = new ol.source.Vector({wrapX: false});

			var vector = new ol.layer.Vector({
				source: source,
				style: new ol.style.Style({
					fill: new ol.style.Fill({
						color: 'rgba(255, 255, 255, 0.2)'
					}),
					stroke: new ol.style.Stroke({
						color: '#ffcc33',
						width: 2
					}),
					image: new ol.style.Circle({
						radius: 7,
						fill: new ol.style.Fill({
							color: '#ffcc33'
						})
					})
				})
			});

			scope.map = new ol.Map({
				layers: [raster, vector],
				renderer: 'canvas',
				target: 'map',
				view: new ol.View({
					center: [0, 0],
					zoom: 2
				})
			});
			scope.source = source;


			eventBus.subscribe("addEntity", function (entity) {
				$scope.markers.push(entity);
			}, "map");

			eventBus.subscribe("onDataReturned", function (entities) {
				this.entities = entities;



			}, "map");

			eventBus.subscribe("timeBucket", function (obj) {
				bucket = obj;
				bucketData();
			}, "map");

			function bucketData(){
				var features = [];
				var size = Math.floor(moment(range.endDate).diff(moment(range.startDate)) / moment.duration(bucket.unitCount, bucket.intervalUnit));
				timeMap = new Array(size);

				for (var i = 0, len=entities.length; i < len; ++i) {
					var entity = entities[i];





					if(entity.lat){
						var feature = new ol.Feature({
							geometry:new ol.geom.Point(ol.proj.transform([entity.lon, entity.lat], 'EPSG:4326', 'EPSG:3857')),
							name: entity.name,
							description: entity.description
						});

						features.push(feature);
						var index = Math.floor(moment(entity.time).diff(moment(range.startDate)) / moment.duration(bucket.unitCount, bucket.intervalUnit));
						if(!timeMap[index]){
							timeMap[index]= [];
						}
						timeMap[index].push(feature);
					}
				}

				createClusters(features);
				if(!timeMap[0]){
					timeMap[0] = [];
				}
				for(var i =1, l=timeMap.length; i<l; i++){
					if(!timeMap[i]){
						timeMap[i] = [];
					}
					timeMap[i] = timeMap[i].concat(timeMap[i-1]);
				}
			}

			eventBus.subscribe("tick", function (obj) {
				var index = Math.floor(moment(obj.start).diff(moment(range.startDate)) / moment.duration(bucket.unitCount, bucket.intervalUnit));
				for (var i = 0; i < layers.length; i++) {
					scope.map.removeLayer(layers[i]);
				}
				layers.length =0;
				if(index >= timeMap.length){
					createClusters(timeMap[timeMap.length-1]);
				}else{
					createClusters(timeMap[index]);
				}


			}, "map");

			eventBus.subscribe("addArc", function (pair) {


			}, "map");

			eventBus.subscribe("clearEntities", function () {
				for (var i = 0; i < layers.length; i++) {
					scope.map.removeLayer(layers[i]);
				}
				layers.length =0;

			}, "map");
			eventBus.subscribe("clearPrimitives", function () {
				source.clear();
			}, "map");



			var draw = undefined;

			var drawCircle = function () {
				if (draw) {
					scope.map.removeInteraction(draw);
					draw = undefined;

				} else {
					draw = new ol.interaction.Draw({
						"source": source,
						type: /** @type {ol.geom.GeometryType} */ ("Circle")
					});
					scope.map.addInteraction(draw);

					draw.on('drawend', function (event) {
						source.clear();
						var coords = ol.proj.toLonLat(event.feature.getGeometry().getCenter());
						var view = scope.map.getView();
						var projection = view.getProjection();
						var resolutionAtEquator = view.getResolution();
						var center = scope.map.getView().getCenter();
						var pointResolution = projection.getPointResolution(resolutionAtEquator, center);
						var resolutionFactor = resolutionAtEquator / pointResolution;
						var radius = ( event.feature.getGeometry().getRadius() * ol.proj.METERS_PER_UNIT.m) / resolutionFactor;
						var centerDegrees = new neon.util.LatLon(coords[1], coords[0]);
						eventBus.publish("createdExtentFilter", {'center': centerDegrees, 'radius': radius}, "dashboard");

					});
				}
			};


			var button = document.createElement('button');
			button.innerHTML = '<i class="fa fa-circle-o"></i>';

			var this_ = this;
			var handleRotateNorth = function (e) {
				this_.getMap().getView().setRotation(0);
			};

			button.addEventListener('click', drawCircle, false);

			var element = document.createElement('div');
			element.className = 'ol-circle ol-control';
			element.appendChild(button);

			var control = new ol.control.Control({
				element: element
			});

			var streamElm = document.createElement('stream');
			streamElm.className = 'ol-stream ol-control';
			var stream = new ol.control.Control({
				element:streamElm
			});

			scope.map.addControl(control);
			scope.map.addControl(stream);
			function log10(val) {
				return Math.log(val) / Math.LN10;
			}

			function createClusters(features){
				var source = new ol.source.Vector({
					features: features
				});

				var clusterSource = new ol.source.Cluster({
					distance: 40,
					source: source
				});

				var styleCache = {};
				var clusters = new ol.layer.Vector({
					source: clusterSource,
					style: function (feature, resolution) {
						var size = feature.get('features').length;
						var style = styleCache[size];
						if (!style) {
							style = [new ol.style.Style({
								image: new ol.style.Circle({
									radius: 10 * log10(size) + 10,
									stroke: new ol.style.Stroke({
										color: '#fff'
									}),
									fill: new ol.style.Fill({
										color: '#3399CC'
									})
								}),
								text: new ol.style.Text({
									text: size.toString(),
									fill: new ol.style.Fill({
										color: '#fff'
									})
								})
							})];
							styleCache[size] = style;
						}
						return style;
					}
				});


				scope.map.addLayer(clusters);
				layers.push(clusters);
			}

			window.onresize = function()
			{
				setTimeout( function() { scope.map.updateSize();}, 200);
			}


		}}
});
