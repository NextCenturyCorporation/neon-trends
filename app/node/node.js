angular.module('neon-trends-node').directive('node', function () {
	return{
		restrict: 'E',
		scope: {
			data:'='
		},
		link:function(scope, elem){
			var eventBus = new neon.eventing.EventBus();


			scope.$watchCollection('data', function(newValues, oldValues){
				if (newValues.nodes.length === oldValues.nodes.length && newValues.links.length === oldValues.links.length && (newValues.counts || newValues.linkCounts)){
					update(newValues.counts, newValues.linkCounts);
				}
				else if (newValues.nodes.length > oldValues.nodes.length || newValues.links.length > oldValues.links.length) {
					for (var i = oldValues.nodes.length; i< newValues.nodes.length; i++){
						addNode(newValues.nodes[i]);
					}
					for (var i = oldValues.links.length; i< newValues.links.length; i++){
						addLink(newValues.links[i].source , newValues.links[i].target );
					}
					update(newValues.counts, newValues.linkCounts);
				}else if (newValues.nodes.length < oldValues.nodes.length || newValues.links.length < oldValues.links.length){
					removeNodes(newValues.nodes.length);
					removeLinks(newValues.links.length);
					update(newValues.counts, newValues.linkCounts);
				}

			})

			var zoom = d3.behavior.zoom()
				.on("zoom", zoomed);


			var width = 700,
				height = 500;

			var tip = d3.tip()
				.attr('class', 'node-tip')
				.offset([-10, 0])
				.html(function(d) {
					return "<table class='table table-bordered'><caption>@" + d.handle + "</caption><thead><tr><th>Tweets</th><th>Retweets</th></tr></thead><tbody><tr><td>" + d.volume + "</td><td>" + d.retweets + "</td></tr></tbody></table>";

				});

			var svg = d3.select("node").append("svg")
				.attr("width", width)
				.attr("height", height)
				.append("g")
				.style("pointer-events", "all")
				.call(zoom);

			svg.call(tip);

			var rect = svg.append("rect")
				.attr("width", width)
				.attr("height", height)
				.style("fill", "none");

			var container = svg.append("g");
			var dots = container.append("g");
			var center = {x: height/2, y:width/2}
			var foci = [{x: 200, y: 250}, {x: 500, y: 250}];
			var radius = 200;

			var force = d3.layout.force()
//				.gravity(function(d) {
//					if (d.weight === 0) {
//						return .05;
//					}
//					else {
//						return .2
//					}
//				})
				.distance(100)
				.charge(function (d){
					if(d.weight===0){
						return(-500);
					}
					else{
						return(-10);
					}
				})
//				.charge(-10)
				.size([width, height]);

			var nodes = force.nodes(),
				links = force.links();



			function nodeSelected(d){
				console.log(d);
				eventBus.publish("NodeSelected", d, "node-graph");
			}


			function addNode(node) {
				var theta = randomTheta();
				var y = center.x +(radius*Math.sin(theta));
				var x = center.y +(radius*Math.cos(theta));
				nodes.push({"id":node.id, "handle":node.handle, "volume":0,"retweets":0, "x": x, "y":y});


//				update();
			}

			function removeNodes(index) {
				nodes.splice(index,nodes.length);
			}
			function removeLinks(index) {
				links.splice(index,links.length);
			}

			function removeNode(id) {
				var i = 0;
				var n = findNode(id);
				while (i < links.length) {
					if ((links[i]['source'] === n)||(links[i]['target'] == n)) links.splice(i,1);
					else i++;
				}
				var index = findNodeIndex(id);
				if(index !== undefined) {
					nodes.splice(index, 1);
					update();
				}
			}

			function addLink(sourceId, targetId) {
//				var sourceNode = findNode(sourceId);
//				var targetNode = findNode(targetId);

//				if((sourceNode !== undefined) && (targetNode !== undefined)) {
					links.push({"source": nodes[sourceId], "target": nodes[targetId] });
//				}
			}

			var findNode = function (id) {
				for (var i=0; i < nodes.length; i++) {
					if (nodes[i].id === id)
						return nodes[i]
				};
			}

			var findNodeIndex = function (id) {
				for (var i=0; i < nodes.length; i++) {
					if (nodes[i].id === id)
						return i
				};
			}


			var update = function (counts, linkCounts) {
				var node = dots.selectAll(".node")
					.data(nodes, function(d) { return d.id;});


				var link = dots.selectAll("line.link")
					.data(links,
					function(d) {
						return d.source.id + "-" + d.target.id; });

				link.enter().insert("line")
					.attr("stroke-width", 1)
					.attr("class", "link");

				link.exit().remove();

				var theta = randomTheta();

				var nodeEnter = node.enter().append("circle")
					.attr("class", "node")
					.attr("r", function (d) {
						return calculateRadius(0);
					})
					.attr("id", function(d){return d.id})
					.attr("fill", function(d){if(d.volume === 0){return "green"}else{return "black"}})
					.on('mouseover', tip.show)
					.on('mouseout', tip.hide)
					.on('click', nodeSelected)
					.call(force.drag);
				nodes.forEach(function(d, i) {
						console.log(d);
//					var theta = randomTheta();
//					d.y = center.x +(radius*Math.sin(theta));
//					d.x = center.y +(radius*Math.cos(theta));
//					node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
				});

				nodeEnter.append("title")
					.attr("dx", 12)
					.attr("dy", ".35em")
					.text(function(d) {return d.handle});

				if (counts) {
					node.filter(function (d) {
						return counts[d.id] !== undefined;
					}).attr("fill", function(d){return "black"})
						.call(function(d){pulse(d, counts)});
				}

				if(linkCounts){
					node.filter(function (d) {
						return linkCounts[d.id] !== undefined;
					}).each(function(d){
							angular.forEach(linkCounts[d.id], function(value){
								d.retweets += value;
						});
					});
				}


				node.exit().remove();

				force.on("tick", function() {
					link.attr("x1", function(d) { return d.source.x; })
						.attr("y1", function(d) { return d.source.y; })
						.attr("x2", function(d) { return d.target.x; })
						.attr("y2", function(d) { return d.target.y; });

					var k = .005;

					node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
				});

				force.start();
			}

			function randomTheta(){
				var randomSign = -1 + Math.round(Math.random()) * 2;
				return randomSign*Math.random()*2*Math.PI;
			}

			function zoomed() {
				container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
			}

			function pulse(d, counts) {
				d.transition()
					.duration(500)
					.attr("r", function (d) {
						d.volume = counts[d.id] + d.volume;
						return calculateRadius(d.volume) * 2;
					})
					.transition()
					.duration(500)
					.attr("r", function (d) {
						return calculateRadius(d.volume);
					})
					.ease('sine');
			};


			function calculateRadius(v) {
				if(v <= 1){
					return 1 * 10;
				}else{
					return (Math.log(v) * 10);
				}


			}

		}
	}
});