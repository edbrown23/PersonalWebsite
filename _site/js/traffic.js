var ctx;
var canvas;
var verts = [];
var edges = [];
var sel_vert;
var sel_ent;
var keyMap = {};
var entities = [];
var dT = 0.33;

$(document).ready(function() {
  init();
});

function init(){
  canvas = document.getElementById('canvas');
  if (canvas.getContext){
    ctx = canvas.getContext('2d');

    canvas.addEventListener('click', on_canvas_click, false);
    $(document).keydown(keyDown);
    $(document).keyup(keyUp);

    setInterval(gameloop, 33);
  }
}

function gameloop(){
  update();
  draw();
}

// I desperately need a linked list
function update(){
  for(var i = 0; i < entities.length; i++){
    if(entities[i].curVert){
      var outboundEdge = entities[i].curVert.edges[Math.floor(Math.random() * entities[i].curVert.edges.length)];
      if(outboundEdge){
        entities[i].curEdge = outboundEdge;
        var ri = entities[i].curVert.ents.indexOf(entities[i]);
        entities[i].curVert.ents.splice(ri, 1);
        entities[i].curVert = false;
        // As an entity has been added to an edge, we have to recalculate its congestion
        outboundEdge.ents.push(entities[i]);
        var newCong = Math.floor(((outboundEdge.ents.length * 9) / outboundEdge.length) * 255);
        outboundEdge.cong = newCong;
        // In order to avoid stoppage at the vertices, we have to nudge entities off the vertex
        var nudge = can_move(entities[i], i, outboundEdge) * dT;
        entities[i].x += outboundEdge.unitVector.x * nudge;
        entities[i].y += outboundEdge.unitVector.y * nudge;
      }
    }else{
      var edge = entities[i].curEdge;
      var moveSpace = can_move(entities[i], i, edge) * dT;
      entities[i].x += edge.unitVector.x * moveSpace;
      entities[i].y += edge.unitVector.y * moveSpace;
      if(vert_dist(entities[i], edge.d) <= 10){
        entities[i].curVert = edge.d;
        entities[i].curVert.ents.push(entities[i]);
        // Before forgetting the edge, we have to recalculate its congestion
        var ri = entities[i].curEdge.ents.indexOf(entities[i]);
        entities[i].curEdge.ents.splice(ri, 1);
        entities[i].curEdge.cong = Math.floor(((entities[i].curEdge.ents.length * 9) / entities[i].curEdge.length) * 255);
        entities[i].curEdge = false;
      }
    }
  }
}

function draw(){
  ctx.fillStyle = "rgba(200, 200, 200, 255)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if(sel_vert){
    ctx.fillStyle = "rgba(255, 255, 0, 255)";
    ctx.beginPath();
    ctx.arc(sel_vert.x, sel_vert.y, 13, 0, Math.PI * 2, false);
    ctx.fill();          
  }

  if(sel_ent){
    ctx.fillStyle = "rgba(0, 255, 0, 255)";
    ctx.beginPath();
    ctx.arc(sel_ent.x, sel_ent.y, 10, 0, Math.PI * 2, false);
    ctx.fill();          
  }

  // Draw the edges
  for(var i = 0; i < edges.length; i++){
    ctx.strokeStyle = "rgba(" + edges[i].cong + ", " + (255 - edges[i].cong) + ", 0, 255)";
    ctx.beginPath();
    ctx.lineWidth = 5;
    var offset = edges[i].drawOffset;
    ctx.moveTo(edges[i].s.x + offset.x, edges[i].s.y + offset.y);
    ctx.lineTo(edges[i].d.x + offset.x, edges[i].d.y + offset.y);
    ctx.stroke();
    for(var dirOff = edges[i].length / 4; dirOff < edges[i].length; dirOff += (edges[i].length / 4)){
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0, 0, 0, 255)";
      ctx.lineWidth = 1;
      var x = dirOff * edges[i].unitVector.x + edges[i].s.x + offset.x;
      var y = dirOff * edges[i].unitVector.y + edges[i].s.y + offset.y;
      var offX = 8 * edges[i].unitVector.x;
      var offY = 8 * edges[i].unitVector.y;
      ctx.moveTo(x, y);
      ctx.lineTo(offX + x, offY + y);
      ctx.stroke();
    }
  }

  // Draw the vertices
  for(var i = 0; i < verts.length; i++){
    ctx.fillStyle = "rgba(100, 0, 200, 255)";
    ctx.beginPath();
    ctx.arc(verts[i].x, verts[i].y, 10, 0, Math.PI * 2, false);
    ctx.fill();
  }

  // Draw the entities
  ctx.fillStyle = "rgba(255, 0, 100, 255)";
  for(var i = 0; i < entities.length; i++){
    ctx.fillStyle = "rgba(" + Math.floor(entities[i].speed * 25.5) + ", 0, " + Math.floor(255 - (entities[i].speed * 25.5)) + ", 255)";
    ctx.beginPath();
    var offset = {x: 0, y: 0};
    if(entities[i].curEdge){
      offset = entities[i].curEdge.drawOffset;
    }
    ctx.arc(entities[i].x + offset.x, entities[i].y + offset.y, 4, 0, Math.PI * 2, false);
    ctx.fill();
  }
}

function can_move(entity, ei, edge){
  for(var d = 1; d < entity.speed; d += 1){
    var dx = (edge.unitVector.x * d);
    var dy = (edge.unitVector.y * d);
    var doff = {x: entity.x + dx, y: entity.y + dy};
    for(var i = 0; i < edge.ents.length; i++){
      if(edge.ents[i].x != entity.x && edge.ents[i].y != entity.y && vert_dist(doff, edge.ents[i]) < 9){
        return d - 1;
      }
    }
  }
  return entity.speed;
}

function on_canvas_click(ev){
  var x = ev.clientX - canvas.offsetLeft + window.scrollX;
  var y = ev.clientY - canvas.offsetTop + window.scrollY;
  
  // If I use a hashtable of some kind, I could speed this up...
  for(var i = 0; i < verts.length; i++){
    if(Math.abs(verts[i].x - x) < 10 && Math.abs(verts[i].y - y) < 10){
      if(keyMap[16] && sel_vert){
        sel_vert.neighbors.push(verts[i]);
        verts[i].neighbors.push(sel_vert);
        create_new_edge(sel_vert, verts[i]);
      }else{
        sel_vert = verts[i];
      }
      return;
    }
  }
  // likewise I'd like to speed up searching for entities
  for(var i = 0; i < entities.length; i++){
    if(Math.abs(entities[i].x - x) < 10 && Math.abs(entities[i].y - y) < 10){
      sel_ent = entities[i];
      return;
    }
  }
  create_new_vertex(x, y);
}

function vert_dist(v1, v2){
  var xsq = (v1.x - v2.x) * (v1.x - v2.x);
  var ysq = (v1.y - v2.y) * (v1.y - v2.y);

  return Math.sqrt(xsq + ysq);
}

function create_new_vertex(x, y){
  var vert = {x: x, y: y, neighbors: [], ents: [], edges: []};
  verts.push(vert);
  sel_vert = vert;
}

function create_new_edge(source, dest){
  var dist = vert_dist(source, dest);
  var unitVector = {x: ((dest.x - source.x) / dist), y: ((dest.y - source.y) / dist)};
  var normalUnitVector = {x: unitVector.y * -1, y: unitVector.x};
  var offset = {x: 0, y: 0};
  offset.x = normalUnitVector.x * 8;
  offset.y = normalUnitVector.y * 8;
  var new_edge = {s: source, d: dest, length: dist, cong: 0, ents: [], unitVector: unitVector, normalVector: normalUnitVector, drawOffset: offset};
  source.edges.push(new_edge);
  edges.push(new_edge);
}

function create_new_entity(){
  if(verts.length > 0){
    var start_vert = verts[Math.floor(Math.random() * verts.length)];
    var speed = Math.floor(((Math.random() * 10) + 1));
    var new_ent = {x: start_vert.x, y: start_vert.y, curVert: start_vert, curEdge: false, speed: speed};
    entities.push(new_ent);
    start_vert.ents.push(new_ent);
  }
}

function calc_vec_mag(vector){
  var xsq = vector.x * vector.x;
  var ysq = vector.y * vector.y;
  return Math.sqrt(xsq + ysq);
}

function keyDown(ev){
  keyMap[ev.keyCode] = true;
  if(ev.keyCode == 78){
    create_new_entity();
  }else if(ev.keyCode == 83){
    if(dT == 0){
      dT = 0.33;
    }else{
      dT = 0;
    }
  }
}

function keyUp(ev){
  keyMap[ev.keyCode] = false;
}