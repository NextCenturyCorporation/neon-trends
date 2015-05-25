angular.module("neon-trends-node").controller('nodeController', ["$scope", function ($scope) {

	var eventBus = new neon.eventing.EventBus();
	var nodes =[], links= [], range, entities, nodeTimeMap, linkTimeMap, countTimeMap;


	var now = (moment('2015/04/11 04:00').format('YYYY/MM/DD 04:00'));
	var start = (moment('2015/04/11 00:00').format('YYYY/MM/DD 00:00'));

	var that = this;
	var previousIndex =-1;
	var range = $scope.range;

	$scope.data = {
		nodes:[],
		links: []
	}

	eventBus.subscribe("tick", function (obj) {
		var index =Math.floor(moment(obj.start).diff(moment(range.startDate)) / moment.duration(that.bucket.unitCount, that.bucket.intervalUnit))
		var nodeIndex = nodeTimeMap[index];
		var linkIndex = linkTimeMap[index];

		//if going forward in time
		if(index > previousIndex){
			$scope.data = {nodes :nodes.slice(0,nodeIndex), links:links.slice(0,linkIndex), counts:countTimeMap[index]};
		}else{
			var count = {};
			angular.forEach(countTimeMap[previousIndex], function(value, key){
				for(var i = index; i>=0; i--){
					if(countTimeMap[i] ? countTimeMap[i][key] : false){
						count[key] = value;
						break;
					}
				}
			})
			$scope.data = {nodes :nodes.slice(0,nodeIndex), links:links.slice(0,linkIndex), counts:count};
		}
		previousIndex = index;
	}, "node");

	eventBus.subscribe("onDataReturned", function(entities){
		that.entities = entities;
	}, "node");


	eventBus.subscribe("timeBucket", function (bucket) {
		that.bucket = bucket;
		createNodeData(bucket);

	}, "node");

	eventBus.subscribe("createdTemporalFilter", function (range) {
		that.range = range;
	}, "node");

	function createNodeData(bucket){
		var size = Math.floor(moment(range.endDate).diff(moment(range.startDate)) / moment.duration(bucket.unitCount, bucket.intervalUnit));
		nodeTimeMap = Array.apply(null, new Array(size)).map(Number.prototype.valueOf,0);
		linkTimeMap = Array.apply(null, new Array(size)).map(Number.prototype.valueOf,0);
		countTimeMap = new Array(size);
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

			if(!entityMap[that.entities[i].id]){
				nodes.push(createNode(that.entities[i]));
				entityMap[that.entities[i].id] = nodes.length-1;
			}else{
				nodes[entityMap[that.entities[i].id]].count++;
				if(!countTimeMap[index]){
					countTimeMap[index] = {};
				}
				countTimeMap[index][that.entities[i].id] = nodes[entityMap[that.entities[i].id]].count;
			}


			nodeTimeMap[index] = nodes.length;


			//just random links for now
			if(nodes.length > 1 && randomIntFromInterval(1,10)%10 ===0){
				var source = randomIntFromInterval(0, nodes.length - 2);
				links.push({"source": source, "target": nodes.length -1});
				linkTimeMap[index] = links.length;
			}


		}
		while(index < size){
			nodeTimeMap[index] = nodes.length;
			index++;
		}
	}

	function createNode(entity){
		return {
			handle: entity.handle,
			count: 1,
			id: entity.id
		}
	}

	function randomIntFromInterval(min,max) {
		return Math.floor(Math.random()*(max-min+1)+min);
	}


}]);
