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

			svg.append("svg:defs").selectAll("marker")
				.data(["end"])      // Different link/path types can be defined here
				.enter().append("svg:marker")    // This section adds in the arrows
				.attr("id", String)
					.attr("viewBox", "0 -5 10 10")
					.attr("refX", 25)
					.attr("refY", 0)
					.attr("markerWidth", 6)
					.attr("markerHeight", 6)
					.attr("orient", "auto")
				.append("svg:path")
					.attr("d", "M0,-5L10,0L0,5");

			var rect = svg.append("rect")
				.attr("width", width)
				.attr("height", height)
				.style("fill", "none");

			var container = svg.append("g");
			var dots = container.append("g").attr("id", "nodes");
			var arrows = container.append("g").attr("id", "links");

			var center = {x: height/2, y:width/2}
			var radius = 500;

			var force = d3.layout.force()
//				.gravity(function(d) {
//					if (d.weight === 0) {
//						return .05;
//					}
//					else {
//						return .2
//					}
//				})
				.gravity(.2)
				.linkDistance(50)
				.charge(function (d){
					return -500/(d.weight+1);
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
				var link = svg.select("#links").selectAll(".link")
					.data(links,
					function(d) {
						return d.source.id + "-" + d.target.id; });

				link.enter().insert("line")
					.attr("stroke-width", 1)
					.attr("class", "link")
					.attr("marker-end", "url(#end)");

				link.exit().remove();

				var node = svg.select("#nodes").selectAll(".node")
					.data(nodes, function(d) { return d.id;});

				var nodeEnter = node.enter().append("circle")
					.attr("class", "node")
					.attr("r", function (d) {
						return calculateRadius(0);
					})
					.attr("id", function(d){return d.id})
					.attr("fill", function(d){if(d.volume != 0){return "black"}else{return "grey"}})
					.on('mouseover', tip.show)
					.on('mouseout', tip.hide)
					.on('click', nodeSelected)
					.call(force.drag);

				nodeEnter.append("title")
					.attr("dx", 12)
					.attr("dy", ".35em")
					.text(function(d) {return d.handle});

				var theta = randomTheta();


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

					node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

					node.each(collide(0.5));
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
					return 5;
				}else{
//					return (Math.log(v) * 10);
					return 5 + v;
				}


			}

			var padding = 1, // separation between circles
				rad=8;

			function collide(alpha) {

				var quadtree = d3.geom.quadtree(force.nodes());
				return function(d) {
					var rb = 2*rad + padding,
						nx1 = d.x - rb,
						nx2 = d.x + rb,
						ny1 = d.y - rb,
						ny2 = d.y + rb;
					quadtree.visit(function(quad, x1, y1, x2, y2) {
						if (quad.point && (quad.point !== d)) {
							var x = d.x - quad.point.x,
								y = d.y - quad.point.y,
								l = Math.sqrt(x * x + y * y);
							if (l < rb) {
								l = (l - rb) / l * alpha;
								d.x -= x *= l;
								d.y -= y *= l;
								quad.point.x += x;
								quad.point.y += y;
							}
						}
						return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
					});
				};
			}

		}
	}
});