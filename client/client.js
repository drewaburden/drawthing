var s = io('/');

function log(text) {
  console.log(text);
}

var ctrlKeyDown = false;

var ingame = false;
var your_turn_to_draw = true;
var canvas, ctx;
var currently_drawing = false;
var context_menu_showing = false;
var drawing_timeout_id;
var drawing_upload_interval = 50; // in ms
var drawing_simplification_tolerance = 0.75;
var drawing_highquality = false;
var simple_click_offset = 0.01;
var default_line_width = 5;
var min_line_width = 2;
var max_line_width = 100;

var x1 = 0;
var x2 = 0;
var y1 = 0;
var y2 = 0;
var points = [];

var draw_color = "#000000";
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
  ingame = true;
}

function nameConflicted() {
  $('#overlay_join').removeClass('hidden');
  $('#join_error_username').removeClass('hidden');
  $('#overlay').removeClass('hidden');
}

function quit() {
  s.emit("req", [global.EVENTS.QUIT]);
  $('#overlay_join').removeClass('hidden');
  $('#overlay').removeClass('hidden');
  ingame = false;
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

s.on('connect', function (data) {
  // Make sure the join dialog is displaying when we successfully connect
  $('#overlay_join').removeClass('hidden');
  $('#overlay').removeClass('hidden');
  $('#overlay_lost_connection').addClass('hidden');
  // Make sure the canvas is cleared
  clearCanvas();
});
// Upon unexpectedly losing connection to server
s.on('disconnect', function (data) {
  quit();
  $('#overlay_join').addClass('hidden');
  $('#overlay').removeClass('hidden');
  $('#overlay_lost_connection').removeClass('hidden');
});

/*******************************************************************************
* event handling
*/
s.on('event', function (data) {
  if (data[0] != global.EVENTS.DRAW_LINE) {
    log('player event: ' + data);
  }
  switch(data[0]) {
    case global.EVENTS.DRAW_LINE: if (ingame) drawReceivedLine(data[1]); break;
    case global.EVENTS.NAME_CONFLICT: nameConflicted(); break;
    default: break;
  }
});

/*******************************************************************************
* initial setup
*/
function init() {
  // Initialize the line width range inputs
  updateLineWidth(default_line_width);
  document.getElementById('line_width').min = min_line_width;
  document.getElementById('line_width_context').min = min_line_width;
  document.getElementById('line_width').max = max_line_width;
  document.getElementById('line_width_context').max = max_line_width;

  canvas = document.getElementById('canvas_original');
  ctx = canvas.getContext("2d");
  ctx.lineCap = 'round';

  canvas.addEventListener("mousemove", function (e) {
    if (currently_drawing) trackLine('move', [e.clientX, e.clientY])
  }, false);
  canvas.addEventListener("mousedown", function (e) {
    if (e.button == 0) {
      setContextMenuVisibility(false);
      document.getElementById('cursor').className = '';
      trackLine('start', [e.clientX, e.clientY])
    }
    else trackLine('stop');
  }, false);
  canvas.addEventListener("mouseout", function (e) {
    document.getElementById('cursor').className = 'hidden';
  }, false);
  canvas.addEventListener("mouseenter", function (e) {
    document.getElementById('cursor').className = '';
  }, false);
  canvas.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    setContextMenuVisibility(true, e.pageX, e.pageY);
    return false;
  }, false);

  $(document).bind("mouseup mouseleave", function () {
    trackLine('stop');
  });
  document.addEventListener("mousewheel", function (e) {
    if (context_menu_showing) {
      e.preventDefault();
      // If the user is holding the control key, increment/decrement slower
      var inc_amount = 3;

      if (e.wheelDeltaY > 0) updateLineWidth(line_width + inc_amount);
      else if (e.wheelDeltaY < 0) updateLineWidth(line_width - inc_amount);
      return false;
    }
    else return true;
  });
  document.addEventListener("keydown", function (e) {
    // Close the context menu if it's open and ESC is pressed
    if (e.which == 27 && context_menu_showing) setContextMenuVisibility(false);
    
    else if (e.ctrlKey) ctrlKeyDown = true;
  });
  document.addEventListener("keyup", function (e) {
    if (!e.ctrlKey) ctrlKeyDown = false;
  });
  document.addEventListener('mousemove', function (e) {
    document.getElementById('cursor').style.left = e.pageX - (line_width / 2) + "px";
    document.getElementById('cursor').style.top = e.pageY - (line_width / 2) + "px";
  });
}

/*******************************************************************************
* Clears the local client's canvas. This will NOT clear other players' canvases.
*/
function clearCanvas() {
  // Remove any existing points
  for (point in points) delete points[point];
  delete points;
  // Make sure the canvas is blank
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

/*******************************************************************************
* Sets the visibility of the context menu. It is placed at the specified
* coordinates when set to visible.
*/
function setContextMenuVisibility(isVisible, x, y) {
  context_menu_showing = isVisible;
  if (isVisible) {
    document.getElementById('context_menu').style.left = x - (line_width / 2) + "px";
    document.getElementById('context_menu').style.top = y - (line_width / 2) + "px";
    document.getElementById('context_menu').className = '';
  }
  else {
    document.getElementById('context_menu').className = 'hidden';
  }
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
  request([global.EVENTS.DRAW_LINE, [simplify(points, drawing_simplification_tolerance, drawing_highquality),
    draw_color, line_width]]);
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
    x2 = point[0] - canvas.offsetLeft + window.pageXOffset;
    y2 = point[1] - canvas.offsetTop + window.pageYOffset;
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
    x2 = point[0] - canvas.offsetLeft + window.pageXOffset;
    y2 = point[1] - canvas.offsetTop + window.pageYOffset;
    points.push([x2, y2]);
    drawLine();
  }
}

/*******************************************************************************
* updates line width, line width previews, and cursor size
*/
function updateLineWidth(width) {    
  // Clamp the line width
  line_width = Math.min(Math.max(width, min_line_width), max_line_width);

  // Update range input values
  document.getElementById('line_width').value = line_width;
  document.getElementById('line_width_context').value = line_width;

  // Update previews
  var preview = document.getElementById('line_preview');
  preview.style.width = line_width + "px";
  preview.style.height = line_width + "px";
  preview.style.marginLeft = (50 - (line_width / 2)) + "px";
  preview.style.marginTop = (25 - (line_width / 2)) + "px";
  preview = document.getElementById('line_preview_context');
  preview.style.width = line_width + "px";
  preview.style.height = line_width + "px";
  preview.style.marginLeft = (50 - (line_width / 2)) + "px";
  preview.style.marginTop = (25 - (line_width / 2)) + "px";

  // Update cursor
  var cursor = document.getElementById('cursor');
  cursor.style.width = line_width + "px";
  cursor.style.height = line_width + "px";
}

function updateLineColor(color) {
  draw_color = color;
  var preview = document.getElementById('line_preview');
  preview.style.backgroundColor = color;
  preview = document.getElementById('line_preview_context');
  preview.style.backgroundColor = color;
}