var ctx;
var canvas;
var keyMap = {};
var pointMasses = [];
var lastTime = 0;
var width;
var height;
var gravity = 0.000098;
var fdT = 17;
var fdTs = fdT / 1000.0;
var ldT = 0;
var constraintAccuracy = 3;
var curtainWidth = 50;
var curtainHeight = 10;
var restingDistances = 15;
var stiffness = 0.01;
var tearSensitivity = 50;
var mouseLastX = 0;
var mouseLastY = 0;

$(document).ready(function() {
  init();
});

function init(){
  canvas = document.getElementById('canvas');
  if (canvas.getContext){
    ctx = canvas.getContext('2d');

    width = canvas.width;
    height = canvas.height;

    canvas.addEventListener('click', onCanvasClick, false);
    $('#canvas').mousedown(mouseDown);
    $(document).mouseup(mouseUp);
    $(document).keydown(keyDown);
    $(document).keyup(keyUp);

    lastTime = new Date();

    createCurtain();

    setInterval(gameloop, 33);
  }
}

function gameloop(){
  var now = new Date();
  update((now - lastTime) / 1000.0);
  draw();
  lastTime = now;
}

function update(dT){
  var timeStepAmt = Math.floor(((dT + ldT) / fdT));
  if(timeStepAmt < 5){
    timeStepAmt = 5;
  }

  ldT = dT - (timeStepAmt * fdT);

  for(var it = 0; it < timeStepAmt; it++){
    // solve constraints for the point masses
    for(var c = 0; c < constraintAccuracy; c++){
      for(var i = 0; i < pointMasses.length; i++){
        pointMasses[i].solveConstraints();
      }
    }

    // update positions
    for(var i = 0; i < pointMasses.length; i++){
      pointMasses[i].updatePhysics(fdT);
      //console.log(pointMasses[i].y);
    }
  }
}

function draw(){
  // clear the screen
  ctx.fillStyle = "rgba(200, 200, 200, 255)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw the point masses
  for(var i = 0; i < pointMasses.length; i++){
    ctx.fillStyle = "rgba(255, 0, 0, 255)";
    ctx.beginPath();
    ctx.arc(pointMasses[i].x, pointMasses[i].y, 2, 0, Math.PI * 2, false);
    ctx.fill();
    // Draw the point masses links
    for(var j = 0; j < pointMasses[i].links.length; j++){
      if(pointMasses[i].links[j].drawn){
        ctx.strokeStyle = "rgba(255, 0, 0, 255)";
        ctx.moveTo(pointMasses[i].links[j].p1.x, pointMasses[i].links[j].p1.y);
        ctx.lineTo(pointMasses[i].links[j].p2.x, pointMasses[i].links[j].p2.y);
        ctx.stroke();
      }
    }
  }
}

function onCanvasClick(ev){
  var x = ev.clientX - canvas.offsetLeft + window.scrollX;
  var y = ev.clientY - canvas.offsetTop + window.scrollY;
  // 16 = left shift
  if(keyMap[16]){
    addNewPointMass(x, y);
  }
}

function mouseDown(ev){
  $('#canvas').on('mousemove', mouseMove);
}

function mouseUp(ev){
  $('#canvas').off('mousemove');
}

function mouseMove(ev){
  var x = ev.pageX - canvas.offsetLeft + window.scrollX;
  var y = ev.pageY - canvas.offsetTop + window.scrollY;

  var dx = x - mouseLastX;
  var dy = y - mouseLastY;

  // try to find a pointmass near the mouse cursor
  for(var i = 0; i < pointMasses.length; i++){
    if(Math.abs(pointMasses[i].x - x) < 10 && Math.abs(pointMasses[i].y - y) < 10){
      // displace the pointmass slightly in the direction of the mouse movement
      pointMasses[i].lastX = pointMasses[i].x - dx;
      pointMasses[i].lastY = pointMasses[i].y - dy;
    }
  }

  mouseLastX = x;
  mouseLastY = y;
}

function addNewPointMass(mx, my){
  var pm = new PointMass(mx, my);
  pointMasses.push(pm);
}

function keyDown(ev){
  keyMap[ev.keyCode] = true;
}

function keyUp(ev){
  keyMap[ev.keyCode] = false;
}

function PointMass(mx, my){
  this.lastX = mx;
  this.lastY = my;
  this.x = mx;
  this.y = my;
  this.accX = 0;
  this.accY = 0;
  this.mass = 100;
  this.damping = 20;
  this.pinned = false;
  this.pinX = 0;
  this.pinY = 0;
  this.links = [];
  this.updatePhysics = function(dT) {
    this.applyForce(0, this.mass * gravity);

    var velX = this.x - this.lastX
    var velY = this.y - this.lastY;

    velX *= 0.99;
    velY *= 0.99;

    var dTSquared = dT * dT;

    var nextX = this.x + velX + 0.5 * this.accX * dTSquared;
    var nextY = this.y + velY + 0.5 * this.accY * dTSquared;

    this.lastX = this.x;
    this.lastY = this.y;

    this.x = nextX;
    this.y = nextY;

    this.accX = 0;
    this.accY = 0;
  };
  this.solveConstraints = function() {
    // link constraints
    for(var i = 0; i < this.links.length; i++){
      this.links[i].solve();
    }

    // boundary constraints
    if(this.y < 1){
      this.y = 2 - this.y;
    }
    if(this.y > height - 1){
      this.y = 2 * (height - 1) - this.y;
    }
    if(this.x < 1){
      this.x = 2 - this.x;
    }
    if(this.x > width - 1){
      this.x = 2 * (width - 1) - this.x;
    }

    if(this.pinned){
      this.x = this.pinX;
      this.y = this.pinY;
    }
  };
  this.applyForce = function(fx, fy) {
    this.accX += fx / this.mass;
    this.accY += fy / this.mass;
  };
  this.pin = function(px, py) {
    this.pinX = px;
    this.pinY = py;
    this.pinned = true;
  };
  this.removeLink = function(link) {
    // assumes the link does exist already
    this.links.splice(this.links.indexOf(link), 1);
  };
}

function Link(pm1, pm2, restingDist, stiff, tearSensitivity, drawn) {
  this.p1 = pm1;
  this.p2 = pm2;

  this.restingDistance = restingDist;
  this.stiffness = stiff;
  this.tearSensitivity = tearSensitivity;
  this.drawn = drawn;
  this.solve = function() {
    var diffX = this.p1.x - this.p2.x;
    var diffY = this.p1.y - this.p2.y;
    var dist = Math.sqrt(diffX * diffX + diffY * diffY);

    var difference = (this.restingDistance - dist) / dist;

    if(dist > this.tearSensitivity){
      this.p1.removeLink(this);
    }

    var im1 = 1 / this.p1.mass;
    var im2 = 1 / this.p2.mass;
    var scalarP1 = (im1 / (im1 + im2)) * this.stiffness;
    var scalarP2 = this.stiffness - scalarP1;

    this.p1.x += diffX * scalarP1 * difference;
    this.p1.y += diffY * scalarP1 * difference;

    this.p2.x -= diffX * scalarP2 * difference;
    this.p2.y -= diffY * scalarP2 * difference;
  };
}

function createCurtain(){
  var midWidth = Math.floor(width / 2 - (curtainWidth * restingDistances) / 2);
  // loop through the necessary point masses to create the curtain
  for(var y = 0; y <= curtainHeight; y++){
    for(var x = 0; x <= curtainWidth; x++){
      var npm = new PointMass(midWidth + x * restingDistances, y * restingDistances + 15);

      if(x != 0){
        nlink = new Link(npm, pointMasses[pointMasses.length - 1], restingDistances, stiffness, tearSensitivity, true);
        npm.links.push(nlink);
        //allLinks.push(nlink);
      }
      if(y != 0){
        nlink = new Link(npm, pointMasses[(y - 1) * (curtainWidth + 1) + x], restingDistances, stiffness, tearSensitivity, true);
        npm.links.push(nlink);
        //allLinks.push(nlink);
      }

      if(y == 0){
        npm.pin(npm.x, npm.y);
      }

      pointMasses.push(npm);
    }
  }
}