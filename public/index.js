// console.log('connecting to server http://localhost:8080');
// const server = io.connect('http://localhost:8080');
// console.log('connecting to server http://192.168.0.48:8000');
// const server = io.connect('http://192.168.0.48:8000');
console.log('connecting to server https://naqeeb.me:8000');
const server = io.connect('https://naqeeb.me:8000');

const canv = document.getElementById('canv');
const ctx = canv.getContext('2d');

canv.height = window.innerHeight;
canv.width = window.innerWidth;

let serverTime = 0;
let ticker = 0;
let timer = null;
let id = null;
let scale = 0.5;

let x = canv.width / 2;
let y = canv.height / 2;

let portrait = false;
if (x < y) {
  portrait = true;
}

let touchx = 0;
let mobileButtons = [
  [canv.width - 60, canv.height - 60, 30],
  [110, canv.height - 60, 20],
  [60, canv.height - 60, 20]
];

let speed = 4;
let rotSpeed = 0;
let rot = 0;
let boost = false;
let fire = false;
let forceServerLocation = true;
let shield = 100;
let health = 100;
const SHIP_COLOUR = [
  'cyan',
  'green',
  'lime',
  'blue',
  'yellow',
  'gold',
  'grey',
  'white'
][Math.floor(Math.random() * 8)];
let FPS = null;

let bullets = [];
let otherBullets = [];
let ships = [];
let dmg = [];
const BULLET_RADIUS = 2;
const BULLET_SPEED = 40;
const BULLET_STROKE = 'blue';
const MAX_BULLETS = 4;
let MAPSIZE = null;
const ROTSPEED_FACTOR = 25;

let back = [];

drawControls();

function drawControls() {
  ctx.fillStyle = 'white';
  const controls = [];
  if (portrait) {
    ctx.font = '12px arial';
    ctx.fillStyle = 'cyan';
    for (let i = controls.length - 1; i > -1; i--) {
      ctx.fillText(controls[i], 50, 50 + i * 20);
    }
    ctx.fillStyle = 'white';
    ctx.font = '32px arial';
    ctx.fillText('Tap to start!', 50, canv.height / 2);

    ctx.font = '16px arial';
    ctx.fillStyle = 'red';
    ctx.fillText('Connecting to server...', 25, 25);
  } else {
    ctx.font = '36px arial';
    ctx.fillStyle = 'cyan';
    for (let i = controls.length - 1; i > -1; i--) {
      ctx.fillText(
        controls[i],
        canv.width / 2 - 380,
        canv.height / 2 + 50 + i * 40
      );
    }
    ctx.fillStyle = 'yellow';
    ctx.font = '76px arial';
    ctx.fillText('Press x to start!', canv.width / 2 - 400, canv.height / 2);

    ctx.font = '40px arial';
    ctx.fillStyle = 'red';
    ctx.fillText(
      'Connecting to server...',
      canv.width / 2 - 200,
      canv.height / 2 - 200
    );
  }
}

function checkProx(x, y, x1, y1, leeway) {
  len = Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));
  if (Math.abs(len) < leeway) {
    return true;
  } else {
    return false;
  }
}

function timerLoop() {
  ctx.clearRect(0, 0, canv.width, canv.height);

  ctx.fillStyle = 'red';
  ctx.font = '20px arial';
  ctx.fillText(health, 0, 20);
  ctx.fillStyle = 'cyan';
  ctx.fillText(shield, 0, 40);

  ctx.translate(canv.width / 2 - x * scale, canv.height / 2 - y * scale);
  ctx.scale(scale, scale);

  back.forEach(bk => {
    ctx.fillStyle = bk[3];
    ctx.fillRect(bk[0], bk[1], bk[2], bk[2]);
  });

  drawShip(x, y, rot, boost, health, shield, SHIP_COLOUR);
  ships.forEach(ship => {
    drawShip(
      ship.x,
      ship.y,

      ship.rot,
      ship.boost,
      ship.health,
      ship.shield,
      ship.col
    );
  });
  bullets.forEach(bullet => {
    drawBullet(bullet);
  });

  otherBullets.forEach(bulls => {
    bulls.bullets.forEach(bull => {
      drawBullet(bull);
    });
  });

  for (let i = 0; i < dmg.length; i++) {
    drawDmg(x, y, dmg[i]);
    if (dmg[i].val > 0) {
      dmg[i].val -= 4;
    }
  }

  dmg = dmg.filter(dm => dm.val > 0);

  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, MAPSIZE, MAPSIZE);

  ctx.scale(1 / scale, 1 / scale);
  ctx.translate(-(canv.width / 2 - x * scale), -(canv.height / 2 - y * scale));

  if (portrait) drawMobileControls();

  rot += rotSpeed / ROTSPEED_FACTOR;
  rot = (rot + 2 * Math.PI) % (2 * Math.PI);
  const modifiedSpeed = boost ? speed * 2 : speed;
  if (0 < rot && rot <= Math.PI) {
    x += modifiedSpeed * Math.sin(rot);
    y -= modifiedSpeed * Math.cos(rot);
  } else {
    y -= modifiedSpeed * Math.cos(rot);
    x += modifiedSpeed * Math.sin(rot);
  }
  if (fire) {
    fireBullet(x, y, rot);
  }
  if (x < 0) {
    x = MAPSIZE;
  }
  if (y < 0) {
    y = MAPSIZE;
  }
  if (x > MAPSIZE) {
    x = 0;
  }
  if (y > MAPSIZE) {
    y = 0;
  }

  if (dmg.length === 0) {
    if (ticker % 100 === 0) {
      if (health < 100) {
        health += Math.ceil((100 - health) / 2);
        dmg.push({
          id: id,
          val: 100,
          x: 0,
          y: 0,
          r: 50 + Math.random() * 5,
          col: 'lime'
        });
      } else {
        if (shield < 100) {
          shield += Math.ceil((100 - shield) / 4);
          dmg.push({
            id: id,
            val: 100,
            x: 0,
            y: 0,
            r: 50 + Math.random() * 10,
            col: 'blue'
          });
        }
      }
    }
  }

  ships.forEach(ship => {
    ship.rot += ship.rotSpeed / ROTSPEED_FACTOR;

    ship.rot = (ship.rot + 2 * Math.PI) % (2 * Math.PI);
    if (0 < ship.rot && ship.rot <= Math.PI) {
      ship.x += (ship.boost ? speed * 2 : speed) * Math.sin(ship.rot);
      ship.y -= (ship.boost ? speed * 2 : speed) * Math.cos(ship.rot);
    } else {
      ship.y -= (ship.boost ? speed * 2 : speed) * Math.cos(ship.rot);
      ship.x += (ship.boost ? speed * 2 : speed) * Math.sin(ship.rot);
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
    if (ship.health < 100) {
      ship.health += 0.25;
    }
    if (ship.shield < 100) {
      ship.shield += 0.05;
    }
  });
  bullets.forEach(bullet => {
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;
    bullet.life = bullet.life / 1.2;
    ships.forEach(ship => {
      if (checkProx(ship.x, ship.y, bullet.x, bullet.y, BULLET_RADIUS + 45)) {
        if (ship.shield > 0) {
          if (forceServerLocation) server.emit('dmg', ship.id);
          ship.shield--;
        } else {
          if (ship.health > 0) {
            if (forceServerLocation) server.emit('dmg', ship.id);
            ship.health -= 2;
          }
        }
      }
    });
  });

  otherBullets.forEach(bulls =>
    bulls.bullets.forEach(bullet => {
      bullet.x += bullet.dx;
      bullet.y += bullet.dy;
      bullet.life = bullet.life / 1.2;
    })
  );

  // let old = bullets.length;
  bullets = bullets.filter(bullet => bullet.life > 0.1);
  otherBullets.forEach(bulls => {
    bulls.bullets = bulls.bullets.filter(bullet => bullet.life > 0.1);
  });
  // if (old > bullets.length) server.emit('bullets', bullets);

  ticker += Math.floor(1000 / FPS);
  if (ticker % FPS === 0) {
    server.emit('update', { x, y, health, shield, rot, rotSpeed });
  }
}

function drawCircle(x, y, rad, fill = 'grey', stroke = 'white') {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arc(x, y, rad, 0, 2 * Math.PI);
  ctx.closePath();
  if (fill !== null) {
    ctx.fill();
  }
  if (stroke !== null) {
    ctx.stroke();
  }
}

function strokeCircle(x, y, rad, val, stroke = 'white', lw = 4) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arc(x, y, rad, 0, val * 2 * Math.PI);
  ctx.stroke();
}

function drawShip(x, y, rot, boost, health, shield, col = SHIP_COLOUR) {
  let offset = 5 * Math.sin(-Math.PI / 2 + ((ticker / 157) % (2 * Math.PI)));
  let offset2 = 5 * Math.sin(-Math.PI / 2 + ((ticker / 628) % (2 * Math.PI)));
  ctx.translate(x, y);
  ctx.rotate(rot);
  drawCircle(-22, 20, 6 + offset2 / 2);
  drawCircle(22, 20, 6 + offset2 / 2);
  drawCircle(0, boost ? 30 : 20, boost ? 30 : 18, 'rgba(255,100,0,0.5)', null);
  drawCircle(
    0,
    boost ? 22 : 20,
    boost ? 22 : 16,
    'rgba(255,255,100,0.5)',
    null
  );
  drawCircle(0, 20, 15, 'rgba(128,255,255,0.5)', null);
  drawCircle(0, 20, 12 - offset / 2, col, null);
  strokeCircle(0, 15, 50, shield / 100, 'cyan', 2 * (1 / scale));
  strokeCircle(0, 15, 46, health / 100, 'red', 2 * (1 / scale));
  // ctx.strokeStyle = 'black';
  ctx.fillStyle = col;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-22, 20);
  ctx.lineTo(0, -20);
  ctx.lineTo(22, 20);
  ctx.lineTo(-22, 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.font = '16px calibri';
  // ctx.stroke();
  ctx.rotate(-rot);
  ctx.fillText(
    `${Math.round(health, 2)}|${Math.round(shield, 2)}`,
    -38 + offset,
    -60 + offset + offset2
  );
  ctx.translate(-x, -y);
}

function drawBullet(bullet) {
  drawCircle(
    bullet.x,
    bullet.y,
    BULLET_RADIUS,
    `rgba(128,255,255,${bullet.life})`,
    null
  );
  strokeCircle(
    bullet.x,
    bullet.y,
    bullet.rad + 5,
    1,
    `rgba(255,255,255,${bullet.life}`,
    3
  );
}

function drawDmg(x, y, dmg) {
  let offset =
    5 * Math.sin(-Math.PI / 2 + dmg.val + ((ticker / 157) % (2 * Math.PI)));
  strokeCircle(
    x + (shield > 0 ? dmg.x * 3 : dmg.x),
    y + (shield > 0 ? dmg.y * 3 : dmg.y),
    dmg.r,
    1,
    dmg.col,
    offset + dmg.val / 10
  );
}
function drawMobileControls() {
  strokeCircle(canv.width - 60, canv.height - 60, 30, 1, 'grey', 5);
  strokeCircle(
    canv.width - 60 + touchx,
    canv.height - 60,
    20,
    1,
    'lightgrey',
    5
  );
  strokeCircle(60, canv.height - 60, 20, 1, 'lightgrey', 5);
  strokeCircle(110, canv.height - 60, 20, 1, 'lightgrey', 5);
  ctx.fillStyle = 'white';
  ctx.font = '12px arial';
  ctx.fillText('✕', mobileButtons[1][0] - 5, mobileButtons[1][1] + 5);
  ctx.fillText('B', mobileButtons[2][0] - 5, mobileButtons[2][1] + 5);
}

function drawCharCard(id, x, y) {
  ctx.strokeStyle = ships.filter(ship => ship.id === id)[0].col;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, 100, 50);
}

function fireBullet(x, y, rot) {
  if (bullets.length > MAX_BULLETS) {
    return;
  }
  let dx = 0;
  let dy = 0;
  if (0 < rot && rot <= Math.PI) {
    dx = x + BULLET_SPEED * Math.sin(rot);
    dy = y - BULLET_SPEED * Math.cos(rot);
  } else {
    dy = y - BULLET_SPEED * Math.cos(rot);
    dx = x + BULLET_SPEED * Math.sin(rot);
  }
  bullets.push({ x: x, y: y, dx: dx - x, dy: dy - y, life: 100 });
  server.emit('bullets', bullets);
}

function addDmgObj(adversary) {
  let atk = ships.filter(ship => ship.id === adversary)[0];
  let dx = x - atk.x;
  let dy = y - atk.y;
  // if (dx > 0) {
  //   console.log((Math.atan(atk.y - y / atk.x - x) * 180) / Math.PI);
  // } else {
  //   console.log((Math.atan(atk.x - x / atk.y - y) * 180) / Math.PI);
  // }

  if (atk !== undefined && atk !== NaN && atk !== null) {
    dmg.push({
      id: adversary,
      val: 100,
      x: -dx / 32 + Math.random() * 10,
      y: -dy / 32 + Math.random() * 10,
      r: 1 + Math.random() * 5,
      col: shield > 0 ? 'rgba(0,255,255,0.5)' : 'rgba(255,0,0,0.5)'
    });
  }
}

server.on('acceptcon', data => {
  console.log(data.id, 'accepted');
  id = data.id;
  FPS = data.fps;
  MAPSIZE = data.MAPSIZE;
  for (let it = 0; it < 1; it++) {
    let x = 0;
    let y = Math.floor(Math.random() * 100);
    while (y < MAPSIZE) {
      x += Math.floor(Math.random() * 500);
      y += 25 - Math.floor(Math.random() * 50);
      if (x > MAPSIZE) {
        x = x % MAPSIZE;
        y += Math.floor(Math.random() * 500);
      }
      back.push([
        x,
        y,
        5,
        `rgb(${Math.floor(Math.random() * 255)},${Math.floor(
          Math.random() * 255
        )},${Math.floor(Math.random() * 255)})`
      ]);
    }
  }

  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, canv.width, portrait ? 50 : 150);
  ctx.fillStyle = 'green';
  ctx.fillText('Connected!', 25, 50);
});

server.on('time', data => {
  serverTime = data;
  console.log(data);
});
server.on('init', data => {
  ships = data;
});
server.on('ships', data => {
  if (forceServerLocation) ships = data.filter(ship => ship.id !== id);
  if (data.filter(ship => ship.id == id).length === 0) {
    server.emit('resendplzty', {
      id,
      x,
      y,
      rot,
      rotSpeed,
      health,
      shield,
      boost,
      speed,
      col: SHIP_COLOUR
    });
  }
  // let str = '';
  // data.forEach(ship => {
  // str += `[id: ${ship.id.slice(0, 4)}]`;
  // });
  // data.forEach(ship => {
  //   str += `[id: ${ship.id.slice(0, 4)} x: ${('' + ship.x).slice(0, 4)} y: ${(
  //     '' + ship.y
  //   ).slice(0, 4)} rot: ${('' + ship.rot).slice(0, 4)} ${
  //     ship.boost ? 'boost' : ''
  //   }]`;
  // });
  // console.log(str);
});

server.on('bullets', data => {
  otherBullets = data.filter(b => b.id !== id);
});

server.on('resendplzty', () => {
  server.emit('resendplzty', {
    id,
    x,
    y,
    rot,
    rotSpeed,
    health,
    shield,
    boost,
    speed,
    col: SHIP_COLOUR
  });
});

server.on('dmg', attacker => {
  if (shield > 0) {
    shield--;
  } else {
    if (health > 0) {
      health -= 2;
    }
  }
  addDmgObj(attacker);

  // console.log('dmg', health, shield, dmg);
});

server.on('bullets', data => (otherBullets = data.filter(d => d.id !== id)));
if (portrait) {
  window.addEventListener('touchstart', e => {
    if (timer === null && id !== null && FPS !== null) {
      var conf = confirm('Fullscreen mode?');
      var docelem = document.documentElement;

      if (conf == true) {
        if (docelem.requestFullscreen) {
          docelem.requestFullscreen();
        } else if (docelem.mozRequestFullScreen) {
          docelem.mozRequestFullScreen();
        } else if (docelem.webkitRequestFullscreen) {
          docelem.webkitRequestFullscreen();
        } else if (docelem.msRequestFullscreen) {
          docelem.msRequestFullscreen();
        }
        canv.height = window.innerHeight;
        canv.width = window.innerWidth;
      }
      server.emit('ack', {
        id,
        x,
        y,
        rot,
        rotSpeed,
        health,
        shield,
        boost,
        col: SHIP_COLOUR
      });
      timer = setInterval(() => {
        timerLoop();
      }, 1000 / FPS);
    }
    for (let i = 0; i < e.changedTouches.length; i++) {
      for (let j = 0; j < mobileButtons.length; j++) {
        if (
          checkProx(
            e.changedTouches[i].pageX,
            e.changedTouches[i].pageY,
            mobileButtons[j][0],
            mobileButtons[j][1],
            mobileButtons[j][2]
          )
        ) {
          switch (j) {
            case 0:
              touchx = e.changedTouches[i].pageX - mobileButtons[j][0];
              rotSpeed =
                ((e.changedTouches[i].pageX - mobileButtons[0][0]) /
                  mobileButtons[0][2]) *
                2 *
                Math.PI;
              break;
            case 1:
              break;
            case 2:
              break;
            default:
              break;
          }
        }
      }
    }
  });

  window.addEventListener('touchmove', e => {
    if (touchx !== null) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (
          checkProx(
            e.changedTouches[i].pageX,
            e.changedTouches[i].pageY,
            mobileButtons[0][0],
            mobileButtons[0][1],
            mobileButtons[0][2]
          )
        ) {
          touchx = e.changedTouches[i].pageX - mobileButtons[0][0];
          rotSpeed =
            ((e.changedTouches[i].pageX - mobileButtons[0][0]) /
              mobileButtons[0][2]) *
            2 *
            Math.PI;
        }
      }
    }
  });

  window.addEventListener('touchend', e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      for (let j = 0; j < mobileButtons.length; j++) {
        if (
          checkProx(
            e.changedTouches[i].pageX,
            e.changedTouches[i].pageY,
            mobileButtons[j][0],
            mobileButtons[j][1],
            mobileButtons[j][2]
          )
        ) {
          switch (j) {
            case 0:
              touchx = null;
              rotSpeed = 0;
              break;
            case 1:
              fire = !fire;
              break;
            case 2:
              boost = !boost;
              break;
            default:
              break;
          }
        }
      }
    }
  });
}
window.addEventListener('keydown', e => {
  switch (e.key) {
    case ' ':
      boost = true;
      server.emit('boost', true);
      break;
    case 'w':
      fire = true;
      break;
    default:
      break;
  }
});

window.addEventListener('keypress', e => {
  switch (e.key) {
    case 's':
      break;
    case 'a':
      if (rotSpeed > -4) {
        rotSpeed -= 2;
      }
      server.emit('rot', rotSpeed);
      break;
    case 'd':
      if (rotSpeed < 4) {
        rotSpeed += 2;
      }
      server.emit('rot', rotSpeed);
      break;
    default:
      break;
  }
});

window.addEventListener('keyup', e => {
  switch (e.key) {
    case 'f':
      forceServerLocation = !forceServerLocation;
      break;
    case ' ':
      boost = false;
      server.emit('boost', false);
      break;
    case 'w':
      fire = false;
      break;
    case 'x':
      if (timer === null && id !== null && FPS !== null) {
        server.emit('ack', {
          id,
          x,
          y,
          rot,
          rotSpeed,
          health,
          shield,
          boost,
          col: SHIP_COLOUR
        });
        timer = setInterval(() => {
          timerLoop();
        }, 1000 / FPS);
        console.log('started');
      }
      break;
    case 'c':
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
        console.log('stopped');
      }
      break;
    case 'z':
      if (scale === 1) {
        scale = 0.5;
      } else {
        scale = 1;
      }
      break;
    default:
      break;
  }
});
