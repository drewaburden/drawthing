global.__base = __dirname + '/';
global._ = require(__base + '/server/underscore');

require(__base + '/shared/constants');

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// game settings
var server_port = 8080;
var intermission_time = 4000; // in ms

/*******************************************************************************
* various internals
*/
// debug settings
var debug = true;
var state_switch_time = 0; // in ms

// because players can leave during the game, they are referenced by id
var players;
var socket_lookup;

function log(text) {
  console.log(text);
}

/*******************************************************************************
* called upon server start
* PRIVATE
*/
function init() {
  server.listen(server_port);
  log('STATE: INIT (setting up server)');
  players = {};
  socket_lookup = {};
}

/*******************************************************************************
* handling of file requests
* PUBLIC
*/
app.use(express.static(__base + '/client'));
app.use(express.static(__base + '/shared'));
app.use(function(req, res){
  res.status(404).send('get out');
});

/*******************************************************************************
* handling of client connections and requests
* PUBLIC
*/
io.on('connection', function (socket) {
  log('INFO: ' + socket.handshake.address.address + ' connected');
  socket.join('login');
  socket.on('req', function (data) {
    log("new request: " + data[0]);
    switch (data[0]) {
      default: break;
    }
  });
  socket.on('disconnect', function () {
    removePlayer(socket);
  });
});

/*******************************************************************************
* registers a client with the game
* PUBLIC
* BROADCASTS
*/
function addPlayer(socket, name) {
  // ensure the client's username meets guidelines, replace with underscores
  var name = name.replace(/[\W]+/g,'_');
  socket.emit('event', [EVENTS.NAME, name]);

  // don't allow any "duplicate" names
  if (name in players) {
    return
  }

  var ip = socket.handshake.address.address;
  if (debug) {
    log('  ' + ip + ' joined as ' + name);
  }

  // add player to list
  io.to('game').emit('event', [EVENTS.JOIN, [name, 0]]);
  players[name] = new Player(ip, name, 0, [], socket.id);
  socket_lookup[socket.id] = name;

  // send full client list to joining player
  for (p in players) {
    socket.emit('event', [EVENTS.JOIN, [p, players[p].score]]);
  }

  // add user to the game room
  socket.leave('login');
  socket.join('game');
  return true;
}

/*******************************************************************************
* handles an updated RoundManager state
*/
/*function handleNewRoundState() {
  switch (RoundMgr.getState()) {
    case STATES.LOBBY: setTimeout(handleLobby, state_switch_time); break;
    case STATES.PLAYING_RESET: setTimeout(startRound, state_switch_time); break;
    case STATES.JUDGING: setTimeout(handleJudging, state_switch_time); break;
    default: break;
  }
}*/

/*******************************************************************************
* removes a client from the game
*/
function removePlayer(socket) {
  var id = socket_lookup[socket.id];
  // if they haven't joined the game yet, don't do anything
  if (id == undefined) {
    return;
  }
  if (debug) {
    log('  player ' + id + ' removed');
  }
  delete players[id];
  delete socket_lookup[socket.id];
  io.to('game').emit('event', [EVENTS.QUIT, id]);
}

/*******************************************************************************
* server init
*/
init();