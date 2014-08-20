function Player(ip, name, score, responses, socket) {
	this.ip = ip;
	this.name = name;
	this.score = score;
	this.responses = responses;
	this.socket = socket;
}

Player.prototype.getClientPlayerObject = function() {
	var player = {};
	player['name'] = this.name;
	player['score'] = this.score;
	return player;
}
module.exports = Player;