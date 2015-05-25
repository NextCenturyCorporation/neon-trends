angular.module('neon', []).factory('Connection', function() {
	neon.SERVER_URL = "/neon";
	var connection = new neon.query.Connection();
	connection.connect(neon.query.Connection.MONGO,"localhost");
	return connection;
});



