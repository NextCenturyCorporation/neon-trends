function entity(obj) {
	//because of the multiple types, we need to inspect the object and convert it into our model.
	if (obj.gnip) {
		return {
			position: Cesium.Cartesian3.fromDegrees(tweet.gnip.profileLocations[0].geo.coordinates[0], tweet.gnip.profileLocations[0].geo.coordinates[1], 0),
			billboard: {
				image: "img/icon-twitter.png"
			},
			name: tweet.actor.preferredUsername,
			description: tweet.body
		}
		entities.push(entity);
	} else if (obj.geo) {
		return {
			position: Cesium.Cartesian3.fromDegrees(tweet.geo.coordinates[0], tweet.geo.coordinates[1], 0),
			billboard: {
				image: "img/icon-twitter.png"
				//user.profile_image_url
			},
			name: tweet.user.screen_name,
			description: tweet.text
		}
	}
}