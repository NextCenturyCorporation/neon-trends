angular.module("neon-trends-node").controller('NodeController', ["$scope", function ($scope) {

	var eventBus = new neon.eventing.EventBus();
	var nodes =[], links= [], entities, nodeTimeMap, linkTimeMap, countTimeMap, linkCountTimeMap, hasLinkMap = {}, content={}, bucket, conversationId=0;

	var previousIndex =-1;
	var range = $scope.range;

	$scope.data = {
		nodes:[],
		links: []
	};

	eventBus.subscribe("tick", function (range) {
			parseTimeFrame(range.start);
	}, "node");

	eventBus.subscribe("onDataReturned", function(data){
		entities = data;
	}, "node");


	eventBus.subscribe("timeBucket", function (data) {
		bucket = data;
		nodes =[];
		links= [];
		content ={};
		createNodeData(bucket);
//		parseTimeFrame(range.endDate);
//		$scope.$apply();
	}, "node");

	eventBus.subscribe("createdTemporalFilter", function (data) {
		range = data;
	}, "node");

	function parseTimeFrame(date){
		var index =Math.floor(moment(date).diff(moment(range.startDate)) / moment.duration(bucket.unitCount, bucket.intervalUnit))
		var nodeIndex = nodeTimeMap[index];
		var linkIndex = linkTimeMap[index];

		//if going forward in time
		if(index > previousIndex){
			$scope.data = {nodes :nodes.slice(0,nodeIndex), links:links.slice(0,linkIndex), index:index, linkCounts: linkCountTimeMap[index]};
		}else{
			var count = {};
			var linkCounts = {};
			angular.forEach(linkCountTimeMap[previousIndex], function(value, key){
				for(var i = index; i>=0; i--){
					if(linkCountTimeMap[i] ? linkCountTimeMap[i][key] : false){
						linkCounts[key] = -value;
						break;
					}
				}
			})
			$scope.data = {nodes :nodes.slice(0,nodeIndex), links:links.slice(0,linkIndex), index:index, linkCounts: linkCounts};
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
		var groups = {};
		var group =0;
		var index;


		var entityMap = {};
		var lastIndex = 0;
		for(var i= 0, length=entities.length; i<length;i++){
			var entity = entities[i];
			index = Math.floor(moment(entity.time).diff(moment(range.startDate)) / moment.duration(bucket.unitCount, bucket.intervalUnit));



			//fill in rest of arrays
			while(lastIndex < index-1){
				nodeTimeMap[lastIndex] = nodes.length;
				linkTimeMap[lastIndex] = links.length;
				lastIndex++;
			}

			//if entity hasn't previous been seen, create and add
			if(!(entityMap[entity.id] > -1) ){
				node = createNode(entity, size)
				nodes.push(node);
				entityMap[entity.id] = nodes.length-1;
			}else{
				node = nodes[entityMap[entity.id]];
			}



			node.count ++;
			node.countArray[index] = node.count;
			//some data has dupes in it, so check id before pushing
			if(!content[entity.status_id]){
				content[entity.status_id] = entity;
				node.content.push(entity.status_id);
			}

			// if has link
			if(entity.status_id){
    			if(content[entity.reply_to_status_id] || entity.reply_to_status_id){
				    var sourceId, source, targetId, target, key;


				    if(content[entity.reply_to_status_id]){
					    sourceId = content[entity.reply_to_status_id].id;
					    source = entityMap[sourceId];
					    target = entityMap[entity.id];
				    }else{
					    //If there is a reply but there isn't an existing node, create node for that user.
					    var node;
					    if(entityMap[entity.reply_to_user_id]){
						    node = nodes[entityMap[entity.reply_to_user_id]];
					    }else{
						    node = createNode({handle: entity.reply_to_user_handle, id: entity.reply_to_user_id}, size);
						    nodes.push(node);
						    entityMap[node.id] = nodes.length-1;
					    }

					    content[entity.reply_to_status_id] = {status_id: entity.reply_to_status_id, id: entity.reply_to_user_id, handle: entity.reply_to_user_handle, description:"unknown"};

					    sourceId = content[entity.reply_to_status_id].id;
					    source = entityMap[sourceId];
					    target = entityMap[entity.id];
				    }

				    //create conversationId
				    var convoId = addToConversation(entity);

				    //add conversation to nodes
				    nodes[entityMap[entity.reply_to_user_id]].conversations.add(convoId);
				    nodes[entityMap[entity.id]].conversations.add(convoId);


				    targetId = entity.id;

					if(!linkCountTimeMap[index]){
						linkCountTimeMap[index] = {};
					}

				    var key = sourceId + "_" + targetId;

				    if(!linksMap[key]){
					    links.push({"source": source, "target": target, "content":[], "conversations": new Set()});
					    linkTimeMap[index] = links.length;
					    linksMap[key] = links.length-1;
				    }
				    links[linksMap[key]].content.push(entity.status_id);
				    links[linksMap[key]].conversations.add(convoId);

				    if(!linkCountTimeMap[index][sourceId]){
					    linkCountTimeMap[index][sourceId] = {};
				    }
				    if(!linkCountTimeMap[index][sourceId][targetId]){
					    linkCountTimeMap[index][sourceId][targetId] = 0;
				    }

				    hasLinkMap[source] = true;
				    hasLinkMap[target] = true;

				    linkCountTimeMap[index][sourceId][targetId]++;

				    //figure out groups
				    if(nodes[source].group >= 0 && !nodes[target].group){
					    nodes[target].group = nodes[source].group;
					    groups[nodes[source].group].push(target);
				    }else if(nodes[target].group >= 0 && !nodes[source].group){
					    nodes[source].group = nodes[target].group;
					    groups[nodes[target].group].push(source);

				    }else if(nodes[source].group >= 0 && nodes[target].group >= 0 && nodes[source].group !== nodes[target].group){
					    var largerGroup, smallerGroup;
						if(groups[nodes[source].group].length >= groups[nodes[target].group].length){
							smallerGroup = nodes[target].group;
							largerGroup = nodes[source].group;
						}else{
							smallerGroup = nodes[source].group;
							largerGroup = nodes[target].group;
						}

					    for(var k=0; k<groups[smallerGroup].length; k++){
						    nodes[groups[smallerGroup][k]].group = largerGroup;
					    }
					    groups[largerGroup] = groups[largerGroup].concat(groups[smallerGroup]);
						groups[smallerGroup] = undefined;


				    }else if(!nodes[source].group && !nodes[target].group){
					    nodes[source].group = group;
					    nodes[target].group = group;
					    groups[group] = [];
					    groups[group].push(source, target);
					    group++;
				    }
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
			if(!hasLinkMap[i]){
				nodes[i].orphaned = true;
			}else{
				nodes[i].orphaned = false;
			}
			for(var j=1; j<nodes[i].countArray.length; j++){
				if(nodes[i].countArray[j] === 0){
					nodes[i].countArray[j] = nodes[i].countArray[j-1];
				}
			}
		}

		var groupArray = [];
		//sort groups so that the larger groups are closer to index 0
		angular.forEach(groups, function(value){
			if(value){
				groupArray.push(value);
			}

		});

		groupArray = groupArray.sort(function(a,b){
			if(a.length > b.length){
				return -1;
			}
			if(a.length < b.length){
				return 1;
			}
			return 0;
		});

		angular.forEach(groupArray, function(value, key){
			angular.forEach(value, function(node){
				node.group=key;
			});
		});

	}

	function addToConversation(entity){
		if(entity.reply_to_status_id){
			if(content[entity.reply_to_status_id].conversationId === undefined){
				content[entity.reply_to_status_id].conversationId = conversationId++;
			}
			entity.conversationId = content[entity.reply_to_status_id].conversationId;
		}else{
			entity.conversationId = conversationId++;
		}
		return entity.conversationId;
	}

	function createNode(entity, size){
		return {
			handle: entity.handle,
			countArray: Array.apply(null, new Array(size)).map(Number.prototype.valueOf,0),
			id: entity.id,
			count: 0,
			content: [],
			conversations: new Set()
		}
	}

}]);
