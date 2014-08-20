global.__base = __dirname + '/';
global._ = require(__base + '/server/underscore');

require(__base + '/shared/constants');

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var Player = require(__base + '/server/Player');

// game settings
var server_port = 8080;
var intermission_time = 4000; // in ms

// stores all the lines that have been drawn by players and their respective line colors and widths
var canvas_lines = [];

/*******************************************************************************
* various internals
*/
// debug settings
var debug = true;
var state_switch_time = 0; // in ms

// because players can leave during the game, they are referenced by id
var players;
var socket_lookup;
var num_ingame = 0; // Number of players currently in-game. Used to check if we need to clear the canvas.

/*******************************************************************************
* log helper function. Takes a log text variable and a log message type of type
* global.LOGTYPE. If no log type is specified, it is assumed to be global.LOGTYPE.NONE
* and will execute the default case.
*/
function log(text, log_type) {
  switch (log_type) {
    case global.LOGTYPE.DEBUG: if (debug) console.log("DEBUG: " + text); break;
    case global.LOGTYPE.WARNING: console.log("WARNING: " + text); break;
    case global.LOGTYPE.ERROR: console.log("ERROR: " + text); break;
    case global.LOGTYPE.STATE: console.log("STATE: " + text); break;
    case global.LOGTYPE.INFO: console.log("INFO: " + text); break;
    default: console.log(text);
  }
}

/*******************************************************************************
* called upon server start
* PRIVATE
*/
function init() {
  server.listen(server_port);
  log('INIT (setting up server)', global.LOGTYPE.STATE);
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
  res.status(404).send("404");
});

/*******************************************************************************
* handling of client connections and requests
* PUBLIC
*/
io.on('connection', function (socket) {
  log(socket.request.connection.remoteAddress + ' connected', global.LOGTYPE.INFO);
  socket.join('login');
  socket.on('req', function (data) {
    if (data[0] != EVENTS.DRAW_LINE) {
      log("new request: " + data[0], global.LOGTYPE.INFO);
    }
    switch (data[0]) {
      case EVENTS.JOIN:
        addPlayer(socket, data[1]);
        break;
      case EVENTS.QUIT:
        removePlayer(socket);
        break;
      case EVENTS.DRAW_LINE:
        canvas_lines.push(data[1]);
        socket.broadcast.emit('event', [EVENTS.DRAW_LINE, data[1]]);
        //io.sockets.emit('event', [EVENTS.DRAW_LINE, data[1]]);
        //socket.broadcast.to('game').emit('message', 'nice game');
        break;
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
    socket.emit('event', [EVENTS.NAME_CONFLICT]);
    return
  }

  var ip = socket.handshake.address.address;
  log(ip + ' joined as ' + name, global.LOGTYPE.DEBUG);

  // add player to list
  io.to('game').emit('event', [EVENTS.JOIN, [name, 0]]);
  players[name] = new Player(ip, name, 0, [], socket.id);
  socket_lookup[socket.id] = name;
  num_ingame++;

  // send full client list to joining player
  for (p in players) {
    socket.emit('event', [EVENTS.JOIN, [p, players[p].score]]);
  }

  // Send the player the current canvas points
  for (line in canvas_lines) {
    socket.emit('event', [EVENTS.DRAW_LINE, canvas_lines[line]]);
  }

  // add user to the game room
  socket.leave('login');
  socket.join('game');
  return true;
}

/*******************************************************************************
* removes a client from the game
*/
function removePlayer(socket) {
  var id = socket_lookup[socket.id];
  // if they haven't joined the game yet, don't do anything
  if (id == undefined) {
    return;
  }
  log('player ' + id + ' removed', global.LOGTYPE.DEBUG);
  delete players[id];
  delete socket_lookup[socket.id];
  num_ingame--;
  io.to('game').emit('event', [EVENTS.QUIT, id]);

  // If there's no players left connected, clear the canvas.
  if ((!players || num_ingame == 0) && canvas_lines) {
    log('no players left.', global.LOGTYPE.INFO)
    clearCanvas();
  }
}

/*******************************************************************************
* clears the server's internal canvas data
*/
function clearCanvas() {
  log('clearing canvas.', global.LOGTYPE.INFO)
  for (line in canvas_lines) delete canvas_lines[line];
  delete canvas_lines;
}

/*******************************************************************************
* server init
*/
init();