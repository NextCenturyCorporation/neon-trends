angular.module('neon-trends-timeline').directive('timeline', function ($window) {
	return{
		restrict: "EA",
		scope: {
			initRange:"=range"
		},
		templateUrl: "timeline/timeline.html",
		link: function(scope, elem, attrs){
			var eventBus = new neon.eventing.EventBus();

			var range = scope.initRange;
			scope.isPlay = false;

			var padding = 20;
			var pathClass="path";
			var totalTickCount = 400;
			var majorTickCount = totalTickCount/8;
			var minorTickCount = majorTickCount/5;
			var xScale, yScale, xAxis, xAxis2, yAxis, lineFun;

			//I don't think this is necessary....
			scope.currentTick;

			var d3 = $window.d3;
			var rawSvg=elem.find('svg');
			var svg = d3.select(rawSvg[0]);
			var svgParent = rawSvg.parent();

			var width= svgParent[0].offsetWidth;
			var height= 100;

			var intervalStats;

			var brush, slider, handle;
			var ticks;

			eventBus.subscribe("createdTemporalFilter", function (obj) {
				range = obj;
			}, "timeline");

			function setChartParameters(data){

				var width= svgParent[0].offsetWidth;
				var height= 100;

				xScale = d3.time.scale()

					.domain([moment(range.startDate).toDate(),moment(range.endDate).toDate()])
					.range([padding + 5, width - padding*2]);

				yScale = d3.scale.linear()
					.domain([0, d3.max(data, function (d) {
						return d.volume;
					})])
//					.domain([0,100])
					.range([height- padding -5, -padding]);

				xAxis = d3.svg.axis()
					.scale(xScale)
					.orient("bottom")
					.ticks(totalTickCount);

				xAxis2 = d3.svg.axis()
					.scale(xScale)
					.orient("bottom")
					.ticks(majorTickCount)
					.tickSize(-100, -100, 0);

				ticks = xScale.ticks(totalTickCount);

				scope.timeBucket = getTimeBucket(ticks);
				yAxis = d3.svg.axis()
					.scale(yScale)
					.orient("left")
					.ticks(6);


				lineFun = d3.svg.line()
					.x(function (d) {
//						console.log(d.time);
						return xScale(d.time);
					})
					.y(function (d) {
//						console.log(d.volume);
						return yScale(d.volume);
					})
					.interpolate("linear");
			}


			eventBus.subscribe("updateTimeline", function(entities){
				scope.currentTick = 0;
				setChartParameters(entities);

				d3.selectAll("#d3timeline > *").remove();

//				svg.append("rect")
//					.attr("class", "grid-background")
//					.attr("width", rawSvg.attr("width")-padding)
//					.attr("height", rawSvg.attr("height")-padding);

				svg.append("svg:g")
					.attr("class", "x axis")
//					.attr("transform", "translate(0,80)")
//					.attr("visible", "false")
					.call(xAxis)
					.select(".domain")
					.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
					.attr("class", "halo");

				svg.append("svg:g")
					.attr("class", "x axis2")
					.attr("transform", "translate(0,75)")
					.call(xAxis2).selectAll(".tick")
					.data(xScale.ticks(minorTickCount), function(d) { return d; })
					.exit()
					.classed("minor", true);

				svg.append("svg:path")
//					.transition()
//					.duration(400)
					.attr("d", lineFun(entities))
					.attr({
						"stroke": "black",
						"stroke-width": 1,
						"fill": "none",
						"class": pathClass
					});

				var firstTick= ticks[0];

				brush = d3.svg.brush()
					.x(xScale)
//					.y(yScale)
//					.extent([startRange,endRange],[0,10])
					.on("brush", moveThroughTime);
				slider = svg.append("svg:g")
					.attr("class", "slider")
					.call(brush);

				handle = slider.append("circle")
					.attr("class", "handle")
					.attr("cx", xScale(firstTick))
					.attr("r", 9);



			}, "timeline");

			function getTimeBucket(xTicks) {
				var firstGap = Math.abs(xTicks[1] - xTicks[0]);
				var secondGap = Math.abs(xTicks[2] - xTicks[1]);
				var milliseconds = 1000;
				var seconds=60
				var minutes = 60;
				var hours = 24;
				var day = hours*minutes;
				var month = 28*day;
				var year = 364*day;
				var timeGapMinutes = Math.max(firstGap, secondGap) / (milliseconds * seconds);
				var unit,count;

				if (timeGapMinutes > year) {
					unit = "year"
					count = timeGapMinutes/(year)
				}
				else if (timeGapMinutes >= month) {
					unit = "month"
					count = timeGapMinutes/(month)
				}
				else if (timeGapMinutes >= day) {
					unit = "day"
					count = timeGapMinutes/(day)
				}
				else if (timeGapMinutes >= minutes) {
					unit = "hour"
					count = timeGapMinutes/(minutes)
				}
				else {
					unit = "minute"
					count = timeGapMinutes;
				}
				 intervalStats = {
					intervalUnit: unit,
					unitCount: count
				};
				if(count){
					eventBus.publish("timeBucket", intervalStats, "timeline");
				}

				return intervalStats;
			}

			function resizeTimeline(){
				//ignoring this for now.
			}

			function moveThroughTime(){
				var value = brush.extent()[0];

				if (d3.event.sourceEvent) { // not a programmatic event
					value = xScale.invert(d3.mouse(this)[0]);
				}
				//how do I get a tick index when I have the value of the tick?
				scope.currentTick = Math.floor(moment(value).diff(moment(range.startDate)) / moment.duration(intervalStats.unitCount, intervalStats.intervalUnit));
				scope.tickRange = {
					start: ticks[scope.currentTick],
					end: ticks[scope.currentTick+1]
				};
				eventBus.publish("tick", scope.tickRange, "timeline");

				handle.attr("cx", xScale(value));
				scope.$apply();
			}

			scope.playTimeline= function (){
				scope.isPlay = !scope.isPlay;
				if(scope.isPlay){
					step(scope.currentTick);
				}
			}

			function step (index){
				if(index < ticks.length-1 && scope.isPlay){
					scope.tickRange = {
						start: ticks[index],
						end: ticks[index+1]
					};
					scope.$apply();
					eventBus.publish("tick", scope.tickRange, "timeline");

				moveToTick(ticks[index+1]);

				setTimeout(function(){step(index+1, ticks)}, 300);
				}
			}

			scope.moment=moment;

			function moveToTick(nextTick){
				d3.select(".handle")
					.transition()
					//.delay(10)
					//.duration(10000)
					.duration(300)
					.ease("linear")
					.attr("cx", xScale(nextTick));
				scope.currentTick = Math.floor(moment(nextTick).diff(moment(range.startDate)) / moment.duration(intervalStats.unitCount, intervalStats.intervalUnit));


			}
		}
	};
	});
