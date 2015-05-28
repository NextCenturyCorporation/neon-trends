angular.module("neon-trends-node").controller('NodeController', ["$scope", function ($scope) {

	var eventBus = new neon.eventing.EventBus();
	var nodes =[], links= [], entities, nodeTimeMap, linkTimeMap, countTimeMap, statuses ={}, linkCountTimeMap;

	var that = this;
	var previousIndex =-1;
	var range = $scope.range;

	$scope.data = {
		nodes:[],
		links: []
	};

	eventBus.subscribe("tick", function (range) {
			parseTimeFrame(range.start);
	}, "node");

	eventBus.subscribe("onDataReturned", function(entities){
		that.entities = entities;
	}, "node");


	eventBus.subscribe("timeBucket", function (bucket) {
		that.bucket = bucket;
		nodes =[];
		links= [];
		statuses ={};
		createNodeData(bucket);
//		parseTimeFrame(range.endDate);
//		$scope.$apply();
	}, "node");

	eventBus.subscribe("createdTemporalFilter", function (range) {
		that.range = range;
	}, "node");

	function parseTimeFrame(date){
		var index =Math.floor(moment(date).diff(moment(range.startDate)) / moment.duration(that.bucket.unitCount, that.bucket.intervalUnit))
		var nodeIndex = nodeTimeMap[index];
		var linkIndex = linkTimeMap[index];

		//if going forward in time
		if(index > previousIndex){
			$scope.data = {nodes :nodes.slice(0,nodeIndex), links:links.slice(0,linkIndex), counts:countTimeMap[index], linkCounts: linkCountTimeMap[index]};
		}else{
			var count = {};
			var linkCounts = {};
			angular.forEach(countTimeMap[previousIndex], function(value, key){
				for(var i = index; i>=0; i--){
					if(countTimeMap[i] ? countTimeMap[i][key] : false){
						count[key] = -value;
						break;
					}
				}
			})
			angular.forEach(linkCountTimeMap[previousIndex], function(value, key){
				for(var i = index; i>=0; i--){
					if(linkCountTimeMap[i] ? linkCountTimeMap[i][key] : false){
						linkCounts[key] = -value;
						break;
					}
				}
			})
			$scope.data = {nodes :nodes.slice(0,nodeIndex), links:links.slice(0,linkIndex), counts:count, linkCounts: linkCounts};
		}
		previousIndex = index;
	}

	function createNodeData(bucket){
		var size = Math.floor(moment(range.endDate).diff(moment(range.startDate)) / moment.duration(bucket.unitCount, bucket.intervalUnit));
		nodeTimeMap = Array.apply(null, new Array(size)).map(Number.prototype.valueOf,0);
		linkTimeMap = Array.apply(null, new Array(size)).map(Number.prototype.valueOf,0);
		countTimeMap = new Array(size);
		linkCountTimeMap = new Array(size);
		var linksMap = {};
		var index;

		var entityMap = {};
		var lastIndex = 0;
		for(var i= 0, length=that.entities.length; i<length;i++){
			index = Math.floor(moment(that.entities[i].time).diff(moment(range.startDate)) / moment.duration(bucket.unitCount, bucket.intervalUnit));

			//fill in rest of arrays
			while(lastIndex < index-1){
				nodeTimeMap[lastIndex] = nodes.length;
				linkTimeMap[lastIndex] = links.length;
				lastIndex++;
			}

			//if entity hasn't previous been seen, create and add
			if(!entityMap[that.entities[i].id]){
				nodes.push(createNode(that.entities[i]));
				entityMap[that.entities[i].id] = nodes.length-1;
			}
			//if the timemap doesn't have a value for the current time
			if(!countTimeMap[index]){
				countTimeMap[index] = {};
			}
			nodes[entityMap[that.entities[i].id]].count++;
			if(!countTimeMap[index][that.entities[i].id]){
				countTimeMap[index][that.entities[i].id] = 0;
			}
			countTimeMap[index][that.entities[i].id]++;

			nodeTimeMap[index] = nodes.length;
			
			
			if(that.entities[i].status_id){
				statuses[that.entities[i].status_id] = that.entities[i].id;
    			if(statuses[that.entities[i].reply_to_status_id] || that.entities[i].reply_to_status_id){
				    var sourceId, source, targetId, target, key;


				    if(statuses[that.entities[i].reply_to_status_id]){
					    sourceId = statuses[that.entities[i].reply_to_status_id];
					    source = entityMap[sourceId];
					    target = entityMap[that.entities[i].id];
				    }else{
					    //If there is a reply but there isn't an existing node, create node for that user.
					    var node = createNode({handle: that.entities[i].reply_to_user_handle, id: that.entities[i].reply_to_user_id});
					    nodes.push(node);
					    statuses[that.entities[i].reply_to_status_id] = node.id;
					    entityMap[node.id] = nodes.length-1;
					    sourceId = statuses[that.entities[i].reply_to_status_id];
					    source = entityMap[sourceId];
					    target = entityMap[that.entities[i].id];
				    }

				    targetId = that.entities[i].id;

					if(!linkCountTimeMap[index]){
						linkCountTimeMap[index] = {};
					}
				    if(!linksMap[key]){
					    links.push({"source": source, "target": target});
					    linkTimeMap[index] = links.length;
				    }
				    if(!linkCountTimeMap[index][sourceId]){
					    linkCountTimeMap[index][sourceId] = {};
				    }
				    if(!linkCountTimeMap[index][sourceId][targetId]){
					    linkCountTimeMap[index][sourceId][targetId] = 0;
				    }

				    linkCountTimeMap[index][sourceId][targetId]++;
				}
			}

			
		}
		while(index < size){
			nodeTimeMap[index] = nodes.length;
			linkTimeMap[index] = links.length;
			index++;
		}
	}

	function createNode(entity){
		return {
			handle: entity.handle,
			count: 0,
			id: entity.id
		}
	}

}]);
