var express = require('express');
var socket = require('socket.io');

var app = express();
var server = app.listen(8080, () => {
  console.log('listening on port 8000');
});

app.use(express.static(__dirname + '/public'));

var io = socket(server);

const FPS = 30;
const MAPSIZE = 5000;

const ROTSPEED_FACTOR = 25;

let ships = [];
let bullets = [];

io.on('connection', con => {
  io.to(con.id).emit('acceptcon', { id: con.id, fps: FPS, MAPSIZE });
  console.log(con.id, 'connected!');
  con.on('ack', data => {
    con.to(con.id).emit('init', ships);
    if (ships.map(ship => ship.id).indexOf(con.id) === -1) {
      ships.push(data);
    }
    io.sockets.emit('resendplzty');
  });
  con.on('resendplzty', data => {
    con.to(con.id).emit('init', ships);
    if (ships.map(ship => ship.id).indexOf(con.id) === -1) {
      ships.push(data);
    }
  });
  con.on('disconnecting', () => {
    console.log(con.id, 'disconnected!');
    ships = ships.filter(ship => {
      ship.id !== con.id;
    });
  });
  con.on('boost', data => {
    if (ships.filter(ship => ship.id === con.id).length > 0) {
      ships.filter(ship => ship.id === con.id)[0].boost = data;
    }
  });
  con.on('rot', data => {
    if (ships.filter(ship => ship.id === con.id).length > 0) {
      ships.filter(ship => ship.id === con.id)[0].rot = data;
    }
  });
  con.on('update', data => {
    if (ships.filter(ship => ship.id === con.id).length > 0) {
      ships.filter(ship => ship.id === con.id)[0].x = data.x;
      ships.filter(ship => ship.id === con.id)[0].y = data.y;
      ships.filter(ship => ship.id === con.id)[0].health = data.health;
      ships.filter(ship => ship.id === con.id)[0].shield = data.shield;
      ships.filter(ship => ship.id === con.id)[0].rot = data.rot;
      ships.filter(ship => ship.id === con.id)[0].rotSpeed = data.rotSpeed;
    }
  });
  con.on('dmg', data => {
    let ship = ships.filter(ship => ship.id === data);
    if (ship.length === 1) {
      io.to(data).emit('dmg', con.id);
    }
  });
  con.on('bullets', data => {
    bullets = bullets.filter(bulls => bulls.id !== con.id);
    bullets.push({ id: con.id, bullets: data });
    io.sockets.emit('bullets', bullets);
  });
});

setInterval(() => {
  ships.forEach(ship => {
    ship.rot += ship.rotSpeed / ROTSPEED_FACTOR;
    if (0 < ship.rot && ship.rot <= Math.PI) {
      ship.x += (ship.boost ? ship.speed * 2 : ship.speed) * Math.sin(ship.rot);
      ship.y -= (ship.boost ? ship.speed * 2 : ship.speed) * Math.cos(ship.rot);
    } else {
      ship.y -= (ship.boost ? ship.speed * 2 : ship.speed) * Math.cos(ship.rot);
      ship.x += (ship.boost ? ship.speed * 2 : ship.speed) * Math.sin(ship.rot);
    }
    if (ship.x < 0) {
      ship.x = MAPSIZE;
    }
    if (ship.y < 0) {
      ship.y = MAPSIZE;
    }
    if (ship.x > MAPSIZE) {
      ship.x = 0;
    }
    if (ship.y > MAPSIZE) {
      ship.y = 0;
    }
  });
}, 1000 / FPS);

setInterval(() => {
  io.sockets.emit('ships', ships);
}, 1000 / 2);
