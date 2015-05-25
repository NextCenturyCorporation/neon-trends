angular.module('neon-trends-node').directive('node', function () {
	return{
		restrict: 'E',
		scope: {
			data:'='
		},
		link:function(scope, elem){
			var eventBus = new neon.eventing.EventBus();


			scope.$watchCollection('data', function(newValues, oldValues){

				if (newValues.nodes.length > oldValues.nodes.length || newValues.links.length > oldValues.links.length) {
					for (var i = oldValues.nodes.length; i< newValues.nodes.length; i++){
						addNode(newValues.nodes[i]);
					}
					for (var i = oldValues.links.length; i< newValues.links.length; i++){
						addLink(newValues.links[i].source , newValues.links[i].target );
					}
					update(newValues.counts);
				}else if (newValues.nodes.length < oldValues.nodes.length || newValues.links.length < oldValues.links.length){
					removeNodes(newValues.nodes.length);
					removeLinks(newValues.links.length);
					update(newValues.counts);
				}

			})

			var zoom = d3.behavior.zoom()
				.on("zoom", zoomed);


			var width = 500,
				height = 500;

			var svg = d3.select("node").append("svg")
				.attr("width", width)
				.attr("height", height)
				.append("g")
				.style("pointer-events", "all")
				.call(zoom);



			var rect = svg.append("rect")
				.attr("width", width)
				.attr("height", height)
				.style("fill", "none")
			var container = svg.append("g");
			var dots = container.append("g");

			var force = d3.layout.force()
				.gravity(.05)
				.distance(100)
				.charge(-100)
				.size([width, height]);

			var nodes = force.nodes(),
				links = force.links();

			function addNode(node) {
				nodes.push({"id":node.id, "handle":node.handle, "volume":node.count});
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


			function updateVolumes(counts){
				if (counts) {
					dots.selectAll(".node")
						.data(nodes, function(d) { return d.id;})
					.filter(function (d) {
						return counts[d.id] > -1;
					})
						.call(function(d){pulse(d, counts)});
				}
			}

			var update = function (counts) {
				//force.nodes(nodes);



				var link = dots.selectAll("line.link")
					.data(links,
					function(d) {
						return d.source.id + "-" + d.target.id; });

				link.enter().insert("line")
					.attr("stroke-width", 1)
					.attr("class", "link");

				link.exit().remove();

				var node = dots.selectAll(".node")
					.data(nodes, function(d) { return d.id;});

				var nodeEnter = node.enter().append("circle")
					.attr("class", "node")
					.attr("r", function (d) {
						return calculateRadius(1);
					})
					.attr("id", function(d){return d.id})
					.call(force.drag);

				nodeEnter.append("title")
					.attr("dx", 12)
					.attr("dy", ".35em")
					.text(function(d) {return d.handle});

				if (counts) {
					node.filter(function (d) {
						return counts[d.id] > -1;
					})
						.call(function(d){pulse(d, counts)});
				}


				node.exit().remove();

				//how to resize nodes
				//svg.select('#' + nodes[0].id).attr("r", function(d) {return (Math.random() * d.volume * 15)});

				force.on("tick", function() {
					link.attr("x1", function(d) { return d.source.x; })
						.attr("y1", function(d) { return d.source.y; })
						.attr("x2", function(d) { return d.target.x; })
						.attr("y2", function(d) { return d.target.y; });

					node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
				});

				// Restart the force layout.
				force.start();
			}

			function zoomed() {
				console.log('zooming')
				container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
			}

			function pulse(d, counts) {
				d.transition()
					.duration(500)
					.attr("r", function (d) {
						return calculateRadius(counts[d.id]) * 2;
					})
					.transition()
					.duration(500)
					.attr("r", function (d) {
						return calculateRadius(counts[d.id]);
					})
					.ease('sine');
			};


			function calculateRadius(v) {
				return (Math.sqrt(v) + 5);
			}


//			addNode("1",1);
//			addNode("2",2);
//			addNode("3",3);
//			addNode("4",4);
//			addNode("5",5);
//			addNode("6",6);
//
//
//			addLink("1", "2");
//			addLink("1", "3");
//			addLink("1", "4");
//			addLink("1", "5");
//			addLink("2", "1");
//			addLink("2", "3");
//			addLink("3", "4");
////			addLink("2", "3");
//
//			update();

		}
	}
});