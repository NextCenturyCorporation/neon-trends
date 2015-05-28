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

		$scope.data = {nodes :nodes.slice(0,nodeIndex), links:links.slice(0,linkIndex), index:index, linkCounts: linkCountTimeMap[index]};

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
			if(!(entityMap[that.entities[i].id] > -1) ){
				node = createNode(that.entities[i], size)
				nodes.push(node);
				entityMap[that.entities[i].id] = nodes.length-1;
			}else{
				node = nodes[entityMap[that.entities[i].id]];
			}



			//if the timemap doesn't have a value for the current time
//			if(!countTimeMap[index]){
//				countTimeMap[index] = {};
//			}
			node.count ++;
			node.countArray[index] = node.count;

			//countTimeMap[index][that.entities[i].id] = nodes[entityMap[that.entities[i].id]].count;


			
			
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
					    var node;
					    if(entityMap[that.entities[i].reply_to_user_id]){
						    node = nodes[entityMap[that.entities[i].reply_to_user_id]];
					    }else{
						    node = createNode({handle: that.entities[i].reply_to_user_handle, id: that.entities[i].reply_to_user_id}, size);
						    nodes.push(node);
						    entityMap[node.id] = nodes.length-1;
					    }

					    statuses[that.entities[i].reply_to_status_id] = node.id;

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
			nodeTimeMap[index] = nodes.length;
		}
		while(index < size){
			nodeTimeMap[index] = nodes.length;
			linkTimeMap[index] = links.length;
			index++;
		}

		for(var i=0; i<nodes.length; i++){
			for(var j=1; j<nodes[i].countArray.length; j++){
				if(nodes[i].countArray[j] === 0){
					nodes[i].countArray[j] = nodes[i].countArray[j-1];
				}
			}

		}



	}

	function createNode(entity, size){
		return {
			handle: entity.handle,
			countArray: Array.apply(null, new Array(size)).map(Number.prototype.valueOf,0),
			id: entity.id,
			count: 0
		}
	}

}]);
