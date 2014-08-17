var your_turn_to_draw = true;
var canvas, ctx;
var currently_drawing = false;
var drawing_timeout_id;
var drawing_upload_interval = 100; // in ms

var x1 = 0;
var x2 = 0;
var y1 = 0;
var y2 = 0;
var points;
var points_simplified;

var draw_color = "black";
var line_width = 5;

/*******************************************************************************
* initial setup
*/
function init() {
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
function drawReceivedLine() {
    canvas2 = document.getElementById('canvas_copy');
    ctx2 = canvas2.getContext("2d");
    ctx2.lineCap = 'round';
    ctx2.strokeStyle = draw_color;
    ctx2.lineWidth = line_width;

    for (var i = 0; i < points_simplified.length - 1; i++) {
        ctx2.beginPath();
        ctx2.moveTo(points_simplified[i][0], points_simplified[i][1]);
        ctx2.lineTo(points_simplified[i+1][0], points_simplified[i+1][1]);
        ctx2.stroke();
        ctx2.closePath();
    }
    
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
    points_simplified = simplify(points, 0.75, false);
    //console.log("Reduced complexity from " + points.length + " to " +
    //    points_simplified.length);
    drawReceivedLine();
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
        points = [];
        points.push([x2, y2]);
        currently_drawing = true;
        drawing_timeout_id = setTimeout(uploadPartialLine,
            drawing_upload_interval);
    }
    else if (evt == 'stop' && currently_drawing) {
        currently_drawing = false;
        clearTimeout(drawing_timeout_id);
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