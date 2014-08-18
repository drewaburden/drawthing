var s = io('/');

function log(text) {
  console.log(text);
}

var your_turn_to_draw = true;
var canvas, ctx;
var currently_drawing = false;
var drawing_timeout_id;
var drawing_upload_interval = 100; // in ms
var simple_click_offset = 0.01;

var x1 = 0;
var x2 = 0;
var y1 = 0;
var y2 = 0;
var points = [];

var draw_color = "black";
var line_width = 5;

/*******************************************************************************
* request handling
*/
function request(payload) {
   s.emit("req", payload);
}

function join(username) {
  state = global.STATES.INIT;
  my_username = username;
  s.emit("req", [global.EVENTS.JOIN, username]);
  $('#overlay').addClass('hidden');
  $('#overlay_join').addClass('hidden');
}

function quit() {
  s.emit("req", [global.EVENTS.QUIT]);
  $('#overlay_join').removeClass('hidden');
  $('#overlay').removeClass('hidden');
}

/*******************************************************************************
* message handling
*/
s.on('msg', function (data) {
  log(data);
});

/*******************************************************************************
* state change handling
*/
s.on('state', function (data) {
  log('new game state: ' + data);
  state = data[0];
  switch(state) {
    default: break;
  }
});

s.on('disconnect', function (data) {
  quit();
  //alert('Lost connection to server :(');
});

/*******************************************************************************
* event handling
*/
s.on('event', function (data) {
  if (data[0] != global.EVENTS.DRAW_LINE) {
    log('player event: ' + data);
  }
  switch(data[0]) {
    //case global.EVENTS.JOIN: addUser(data[1]); break;
    //case global.EVENTS.NAME: my_username = data[1]; break;
    //case global.EVENTS.QUIT: $("[user='" + data[1] + "']").remove(); break;
    case global.EVENTS.DRAW_LINE: drawReceivedLine(data[1]); break;
    default: break;
  }
});

/*******************************************************************************
* initial setup
*/
function init() {
  updateLineStyle();
  canvas = document.getElementById('canvas_original');
  ctx = canvas.getContext("2d");
  ctx.lineCap = 'round';

  canvas.addEventListener("mousemove", function (e) {
    trackLine('move', [e.clientX, e.clientY])
  }, false);
  canvas.addEventListener("mousedown", function (e) {
    trackLine('start', [e.clientX, e.clientY])
  }, false);
  canvas.addEventListener("mouseup", function (e) {
    trackLine('stop');
  }, false);
  canvas.addEventListener("mouseout", function (e) {
    trackLine('stop');
  }, false);
}

/*******************************************************************************
* draws a line received from the server onto canvas
*/
function drawReceivedLine(data) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = data[1];
  ctx.lineWidth = data[2];

  var line_points = data[0];
  for (var i = 0; i < line_points.length - 1; i++) {
    ctx.beginPath();
    ctx.moveTo(line_points[i][0], line_points[i][1]);
    ctx.lineTo(line_points[i+1][0], line_points[i+1][1]);
    ctx.stroke();
    ctx.closePath();
  }
  
}

/*******************************************************************************
* draws a line onto canvas
*/
function drawLine() {
  ctx.beginPath();
  // handle simple clicks
  if (points.length == 1) {
    y2 += simple_click_offset;
  }
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.closePath();
}

/*******************************************************************************
* simplifies a drawn line and sends it to the server
*/
function uploadLine() {
  // handle simple clicks
  if (points.length == 1) {
    points.push([points[0][0], points[0][1] + simple_click_offset])
  }
  request([global.EVENTS.DRAW_LINE, [simplify(points, 0.75, false),
    draw_color, line_width]]);
  //console.log("Reduced complexity from " + points.length + " to " +
  //  points_simplified.length);
  //drawReceivedLine();
}

/*******************************************************************************
* called on interval to send parts of a line while the user is still drawing it
*/
function uploadPartialLine() {
  uploadLine();
  points = points.slice(points.length - 1);
  drawing_timeout_id = setTimeout(uploadPartialLine, drawing_upload_interval);
}

/*******************************************************************************
* tracks the points being drawn
*/
function trackLine(evt, point) {
  if (!your_turn_to_draw) {
    return;
  }
  else if (evt == 'start') {
    x2 = point[0] - canvas.offsetLeft;
    y2 = point[1] - canvas.offsetTop;
    x1 = x2;
    y1 = y2;
    ctx.strokeStyle = draw_color;
    ctx.lineWidth = line_width;
    points.push([x2, y2]);
    currently_drawing = true;
    drawing_timeout_id = setTimeout(uploadPartialLine,
      drawing_upload_interval);
  }
  else if (evt == 'stop' && currently_drawing) {
    currently_drawing = false;
    clearTimeout(drawing_timeout_id);
    // handle simple clicks
    if (points.length == 1) {
      drawLine();
    }
    uploadLine();
    points = [];
  }
  else if (evt == 'move' && currently_drawing) {
    x1 = x2;
    y1 = y2;
    x2 = point[0] - canvas.offsetLeft;
    y2 = point[1] - canvas.offsetTop;
    points.push([x2, y2]);
    drawLine();
  }
}

/*******************************************************************************
* updates draw color or width
*/
function updateLineStyle() {
  line_width = document.getElementById('line_width').value;
  var preview = document.getElementById('line_preview');
  preview.style.width = (parseInt(line_width) + 1) + "px";
  preview.style.height = (parseInt(line_width) + 1) + "px";
  preview.style.marginLeft = (50 - (line_width / 2)) + "px";
  preview.style.marginTop = (25 - (line_width / 2)) + "px";
  //alert(preview.style.width);
}