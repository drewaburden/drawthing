var your_turn_to_draw = true;
var canvas, ctx;
var currently_drawing = false;

var x1 = 0;
var x2 = 0;
var y1 = 0;
var y2 = 0;
var points;
var points_simplified;

var draw_color = "black";
var line_width = 2;

/*******************************************************************************
* initial setup
*/
function init() {
    canvas = document.getElementById('canvas_original');
    ctx = canvas.getContext("2d");

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
function drawReceivedLine() {
    canvas2 = document.getElementById('canvas_copy');
    ctx2 = canvas2.getContext("2d");
    ctx2.beginPath();
    ctx2.moveTo(points_simplified[0][0], points_simplified[0][1]);
    for (var i = 1; i < points_simplified.length; i++) {
        ctx2.lineTo(points_simplified[i][0], points_simplified[i][1]);
    }
    ctx2.strokeStyle = draw_color;
    ctx2.lineWidth = line_width;
    ctx2.stroke();
}

/*******************************************************************************
* draws a line onto canvas
*/
function drawLine() {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = draw_color;
    ctx.lineWidth = line_width;
    ctx.stroke();
    ctx.closePath();
}

/*******************************************************************************
* simplifies a drawn line and sends it to the server
*/
function uploadLine() {
    points_simplified = simplify(points, 0.5, true);
    console.log("Reduced complexity from " + points.length + " to " +
        points_simplified.length);
    drawReceivedLine();
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
        points = [];
        points.push([x2, y2]);
        currently_drawing = true;
    }
    else if (evt == 'stop' && currently_drawing) {
        currently_drawing = false;
        uploadLine();
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