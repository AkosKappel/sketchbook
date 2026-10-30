const STEP = 1 / 120; // fixed physics step in seconds, so the game runs at the same speed on any screen
const START_LIVES = 3;
const MAX_BULLETS = 5;
const BULLET_LIFE = 0.9;
const FIRE_DELAY = 0.16;
const TURN_SPEED = 4.4; // radians per second
const INVULNERABLE_TIME = 2.5;
const RADIUS = [0, 12, 24, 46]; // asteroid radius by size, before scaling to the screen
const POINTS = [0, 100, 50, 20];
const ASTEROID_COLORS = ['#7aa7ff', '#c39bff'];
const SHIP_COLOR = '#e8ebf2';
const FIRE_COLOR = '#f5b942';
// ship outline pointing right (angle 0), in unscaled pixels
const SHIP_SHAPE = [
  [15, 0],
  [-10, -9],
  [-6, 0],
  [-10, 9],
];

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const outputs = {
  score: document.getElementById('score'),
  lives: document.getElementById('lives'),
  wave: document.getElementById('wave'),
  best: document.getElementById('best'),
};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let width = 0;
let height = 0;
let unit = 1; // shrinks sizes and speeds on small screens
let stars = []; // { x, y, alpha } with x and y as fractions of the stage
let ship;
let bullets = [];
let asteroids = [];
let debris = []; // flying line segments
let particles = [];
let score = 0;
let best = loadBest();
let lives = START_LIVES;
let wave = 0;
let fireCooldown = 0;
let respawnTimer = 0;
let waveTimer = 0; // counts down to the next wave once the field is clear
let overTimer = 0; // lets the explosion play out before the game over screen
let bannerTime = 0;
let shakeTime = 0;
let state = 'ready'; // ready | running | paused | over

const keys = new Set();
const touchHeld = { left: false, right: false, thrust: false, fire: false };

const random = (min, max) => min + Math.random() * (max - min);
const wrap = (value, size) => ((value % size) + size) % size;

function newGame() {
  score = 0;
  lives = START_LIVES;
  wave = 0;
  bullets = [];
  debris = [];
  particles = [];
  respawnTimer = 0;
  overTimer = 0;
  waveTimer = 0;
  ship = createShip();
  startWave();
  showStats();
}

function createShip() {
  return { x: width / 2, y: height / 2, vx: 0, vy: 0, angle: -Math.PI / 2, alive: true, invulnerable: INVULNERABLE_TIME, thrusting: false };
}

function startWave() {
  wave++;
  bannerTime = 2;
  const count = Math.min(3 + wave, 11);
  for (let i = 0; i < count; i++) {
    // anywhere except close to the ship
    let x;
    let y;
    do {
      x = Math.random() * width;
      y = Math.random() * height;
    } while (Math.hypot(x - ship.x, y - ship.y) < Math.min(width, height) * 0.35);
    asteroids.push(createAsteroid(x, y, 3));
  }
  showStats();
}

function createAsteroid(x, y, size, baseVx = 0, baseVy = 0) {
  const r = RADIUS[size] * unit;
  const direction = Math.random() * Math.PI * 2;
  // smaller rocks and later waves fly faster
  const speed = random(20, 50) * (4 - size) ** 0.6 * (1 + wave * 0.05) * unit;
  const vertices = Math.floor(random(9, 13));
  const shape = Array.from({ length: vertices }, (_, i) => {
    const angle = (i / vertices) * Math.PI * 2;
    const radius = r * random(0.7, 1.15);
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });
  return {
    x,
    y,
    vx: baseVx + Math.cos(direction) * speed,
    vy: baseVy + Math.sin(direction) * speed,
    r,
    size,
    angle: 0,
    spin: random(-0.8, 0.8),
    shape,
    color: ASTEROID_COLORS[Math.floor(Math.random() * ASTEROID_COLORS.length)],
  };
}

// Game loop

let last = performance.now();
let accumulator = 0;

function frame(now) {
  // clamped so a long stall (background tab) doesn't run hundreds of steps at once
  accumulator += Math.min((now - last) / 1000, 0.25);
  last = now;
  while (accumulator >= STEP) {
    if (state === 'running') update(STEP);
    accumulator -= STEP;
  }
  draw();
  requestAnimationFrame(frame);
}

function update(dt) {
  updateShip(dt);
  for (const bullet of bullets) {
    move(bullet, dt);
    bullet.life -= dt;
  }
  bullets = bullets.filter((bullet) => bullet.life > 0);
  for (const asteroid of asteroids) {
    move(asteroid, dt);
    asteroid.angle += asteroid.spin * dt;
  }
  updateEffects(dt);
  checkCollisions();
  updateTimers(dt);
}

function move(body, dt) {
  body.x = wrap(body.x + body.vx * dt, width);
  body.y = wrap(body.y + body.vy * dt, height);
}

function updateShip(dt) {
  fireCooldown -= dt;
  if (!ship.alive) return;
  const turn = held('right', 'ArrowRight', 'KeyD') - held('left', 'ArrowLeft', 'KeyA');
  ship.angle += turn * TURN_SPEED * dt;
  ship.thrusting = held('thrust', 'ArrowUp', 'KeyW');
  if (ship.thrusting) {
    ship.vx += Math.cos(ship.angle) * 300 * unit * dt;
    ship.vy += Math.sin(ship.angle) * 300 * unit * dt;
  }
  // mild drag, so the ship drifts for a while but eventually settles
  const drag = Math.exp(-0.45 * dt);
  ship.vx *= drag;
  ship.vy *= drag;
  const speed = Math.hypot(ship.vx, ship.vy);
  const maxSpeed = 420 * unit;
  if (speed > maxSpeed) {
    ship.vx *= maxSpeed / speed;
    ship.vy *= maxSpeed / speed;
  }
  move(ship, dt);
  ship.invulnerable = Math.max(0, ship.invulnerable - dt);

  if (held('fire', 'Space') && fireCooldown <= 0 && bullets.length < MAX_BULLETS) shoot();
}

function shoot() {
  fireCooldown = FIRE_DELAY;
  const speed = 520 * unit;
  const nose = 15 * unit;
  bullets.push({
    x: ship.x + Math.cos(ship.angle) * nose,
    y: ship.y + Math.sin(ship.angle) * nose,
    vx: ship.vx + Math.cos(ship.angle) * speed,
    vy: ship.vy + Math.sin(ship.angle) * speed,
    life: BULLET_LIFE,
  });
}

function hyperspace() {
  if (state !== 'running' || !ship.alive) return;
  burst(ship.x, ship.y, SHIP_COLOR, 12);
  ship.x = Math.random() * width;
  ship.y = Math.random() * height;
  ship.vx = 0;
  ship.vy = 0;
  burst(ship.x, ship.y, SHIP_COLOR, 12);
}

function updateEffects(dt) {
  for (const piece of debris) {
    move(piece, dt);
    piece.angle += piece.spin * dt;
    piece.life -= dt;
  }
  debris = debris.filter((piece) => piece.life > 0);
  for (const particle of particles) {
    move(particle, dt);
    particle.vx *= 0.99;
    particle.vy *= 0.99;
    particle.life -= dt;
  }
  particles = particles.filter((particle) => particle.life > 0);
  shakeTime = Math.max(0, shakeTime - dt);
  bannerTime = Math.max(0, bannerTime - dt);
}

function checkCollisions() {
  for (const bullet of bullets) {
    const hit = asteroids.find((asteroid) => Math.hypot(bullet.x - asteroid.x, bullet.y - asteroid.y) < asteroid.r);
    if (hit) {
      bullet.life = 0;
      breakAsteroid(hit);
    }
  }
  bullets = bullets.filter((bullet) => bullet.life > 0);

  if (ship.alive && ship.invulnerable === 0) {
    // the outline is a little smaller than the radius, so near misses feel fair
    const hit = asteroids.find((asteroid) => Math.hypot(ship.x - asteroid.x, ship.y - asteroid.y) < asteroid.r * 0.85 + 9 * unit);
    if (hit) {
      breakAsteroid(hit);
      destroyShip();
    }
  }
}

function breakAsteroid(asteroid) {
  asteroids.splice(asteroids.indexOf(asteroid), 1);
  addScore(POINTS[asteroid.size]);
  if (asteroid.size > 1) {
    for (let i = 0; i < 2; i++) {
      asteroids.push(createAsteroid(asteroid.x, asteroid.y, asteroid.size - 1, asteroid.vx * 0.5, asteroid.vy * 0.5));
    }
  }
  // every other edge of the outline breaks off as a spinning line
  const { shape } = asteroid;
  for (let i = 0; i < shape.length; i += 2) {
    const a = rotate(shape[i], asteroid.angle);
    const b = rotate(shape[(i + 1) % shape.length], asteroid.angle);
    addDebris(asteroid.x, asteroid.y, a, b, asteroid, asteroid.color, random(0.5, 0.9), 0.7);
  }
  burst(asteroid.x, asteroid.y, asteroid.color, 6 + asteroid.size * 5);
}

function destroyShip() {
  ship.alive = false;
  ship.thrusting = false;
  lives--;
  showStats();
  // the outline's lines fly apart
  const points = SHIP_SHAPE.map((point) => rotate([point[0] * unit, point[1] * unit], ship.angle));
  for (let i = 0; i < points.length; i++) {
    addDebris(ship.x, ship.y, points[i], points[(i + 1) % points.length], ship, SHIP_COLOR, random(1.4, 2.2), 1);
  }
  burst(ship.x, ship.y, FIRE_COLOR, 30);
  if (!reducedMotion) shakeTime = 0.4;
  if (lives > 0) respawnTimer = 1.5;
  else overTimer = 2;
}

function updateTimers(dt) {
  if (!ship.alive && lives > 0) {
    respawnTimer -= dt;
    // only come back once the middle of the screen is free of rocks
    const clear = asteroids.every((asteroid) => Math.hypot(asteroid.x - width / 2, asteroid.y - height / 2) > asteroid.r + 90 * unit);
    if (respawnTimer <= 0 && clear) ship = createShip();
  }

  if (overTimer > 0) {
    overTimer -= dt;
    if (overTimer <= 0) setState('over');
  }

  if (asteroids.length === 0 && lives > 0) {
    if (waveTimer === 0) {
      waveTimer = 2;
      // a small reward every fifth wave, not after each one
      if (wave % 5 === 0) celebrateOver(canvas);
    }
    waveTimer = Math.max(0, waveTimer - dt);
    if (waveTimer === 0) startWave();
  }
}

// Effects

function rotate([x, y], angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos - y * sin, x * sin + y * cos];
}

// A line from a to b (relative to x, y) that drifts away from the center it broke off
function addDebris(x, y, a, b, parent, color, life, speedScale) {
  const midX = (a[0] + b[0]) / 2;
  const midY = (a[1] + b[1]) / 2;
  const distance = Math.hypot(midX, midY) || 1;
  const speed = random(30, 90) * unit * speedScale;
  debris.push({
    x: x + midX,
    y: y + midY,
    vx: parent.vx * 0.6 + (midX / distance) * speed,
    vy: parent.vy * 0.6 + (midY / distance) * speed,
    angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
    spin: random(-3, 3),
    half: Math.hypot(b[0] - a[0], b[1] - a[1]) / 2,
    life,
    maxLife: life,
    color,
  });
}

function burst(x, y, color, count) {
  for (let i = 0; i < (reducedMotion ? Math.ceil(count / 4) : count); i++) {
    const direction = Math.random() * Math.PI * 2;
    const speed = random(20, 160) * unit;
    const life = random(0.3, 0.9);
    particles.push({ x, y, vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed, life, maxLife: life, color });
  }
}

// Drawing

function draw() {
  ctx.fillStyle = 'rgb(14, 18, 27)';
  ctx.fillRect(0, 0, width, height);
  for (const star of stars) {
    ctx.fillStyle = `rgba(232, 235, 242, ${star.alpha})`;
    ctx.fillRect(star.x * width, star.y * height, 1.5, 1.5);
  }

  ctx.save();
  if (shakeTime > 0) {
    const strength = (shakeTime / 0.4) * 8 * unit;
    ctx.translate(random(-strength, strength), random(-strength, strength));
  }
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (const asteroid of asteroids) {
    drawWrapped(asteroid.x, asteroid.y, asteroid.r * 1.15, (x, y) => {
      outline(asteroid.shape, x, y, asteroid.angle, true);
      glowStroke(asteroid.color);
    });
  }

  for (const piece of debris) {
    const dx = Math.cos(piece.angle) * piece.half;
    const dy = Math.sin(piece.angle) * piece.half;
    ctx.beginPath();
    ctx.moveTo(piece.x - dx, piece.y - dy);
    ctx.lineTo(piece.x + dx, piece.y + dy);
    glowStroke(piece.color, Math.min(1, piece.life / piece.maxLife + 0.2));
  }

  for (const particle of particles) {
    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = FIRE_COLOR;
  for (const bullet of bullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (ship && ship.alive) drawShip();
  ctx.restore();

  if (bannerTime > 0 && state === 'running') {
    ctx.globalAlpha = Math.min(1, bannerTime);
    ctx.fillStyle = SHIP_COLOR;
    ctx.font = `600 ${Math.round(28 * unit)}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE ${wave}`, width / 2, height * 0.3);
    ctx.globalAlpha = 1;
  }
}

function drawShip() {
  // blinks while invulnerable after a respawn
  if (ship.invulnerable > 0 && Math.floor(ship.invulnerable * 8) % 2 === 0) return;
  const shape = SHIP_SHAPE.map(([x, y]) => [x * unit, y * unit]);
  drawWrapped(ship.x, ship.y, 16 * unit, (x, y) => {
    if (ship.thrusting) {
      const flame = random(10, 18) * unit; // flickers a little every frame
      outline(
        [
          [-7 * unit, -4.5 * unit],
          [-7 * unit - flame, 0],
          [-7 * unit, 4.5 * unit],
        ],
        x,
        y,
        ship.angle,
        false,
      );
      glowStroke(FIRE_COLOR);
    }
    outline(shape, x, y, ship.angle, true);
    glowStroke(SHIP_COLOR);
  });
}

function outline(points, x, y, angle, closed) {
  ctx.beginPath();
  for (const [index, point] of points.entries()) {
    const [px, py] = rotate(point, angle);
    if (index === 0) ctx.moveTo(x + px, y + py);
    else ctx.lineTo(x + px, y + py);
  }
  if (closed) ctx.closePath();
}

// a wide faint stroke under a thin bright one looks like a glow, far cheaper than shadowBlur
function glowStroke(color, alpha = 1) {
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.18 * alpha;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// draws a second copy on the opposite edge while a body crosses it, so nothing pops out of view
function drawWrapped(x, y, r, drawAt) {
  const xs = [x];
  const ys = [y];
  if (x < r) xs.push(x + width);
  else if (x > width - r) xs.push(x - width);
  if (y < r) ys.push(y + height);
  else if (y > height - r) ys.push(y - height);
  for (const px of xs) for (const py of ys) drawAt(px, py);
}

// State and score

function addScore(points) {
  score += points;
  if (score > best) {
    best = score;
    saveBest(best);
  }
  showStats();
}

function showStats() {
  outputs.score.value = score;
  outputs.lives.value = lives;
  outputs.wave.value = wave;
  outputs.best.value = best;
}

function setState(next) {
  state = next;
  const messages = {
    ready: ['Asteroids', 'Split the rocks, dodge the pieces. Press Space or tap to start'],
    paused: ['Paused', 'Press Space or tap to continue'],
    over: ['Game over', `Score ${score}, wave ${wave}. Press Space or tap to play again`],
  };
  overlay.hidden = state === 'running';
  if (messages[state]) {
    [overlayTitle.textContent, overlayText.textContent] = messages[state];
  }
}

function handleAction() {
  if (state === 'running') {
    setState('paused');
    return;
  }
  if (state === 'over') newGame();
  setState('running');
}

function loadBest() {
  try {
    return Number(localStorage.getItem('asteroids-best')) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem('asteroids-best', value);
  } catch {
    // storage unavailable (private mode), the best score just isn't kept
  }
}

// Input

function held(control, ...codes) {
  return touchHeld[control] || codes.some((code) => keys.has(code));
}

const GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];

document.addEventListener('keydown', (event) => {
  if (GAME_KEYS.includes(event.code)) event.preventDefault(); // keep the page from scrolling
  if (event.code === 'Space' && state !== 'running') {
    if (!event.repeat) handleAction();
    return;
  }
  if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat && state !== 'ready' && state !== 'over') {
    handleAction();
    return;
  }
  if (event.code === 'KeyH' && !event.repeat) hyperspace();
  keys.add(event.code);
});
document.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

// each button follows its own fingers, so turning, thrusting and firing work at the same time
for (const button of document.querySelectorAll('[data-control]')) {
  const control = button.dataset.control;
  const pointers = new Set();
  const refresh = () => {
    touchHeld[control] = pointers.size > 0;
    button.classList.toggle('active', touchHeld[control]);
  };
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    pointers.add(event.pointerId);
    refresh();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(type, (event) => {
      pointers.delete(event.pointerId);
      refresh();
    });
  }
  button.addEventListener('contextmenu', (event) => event.preventDefault());
}

document.getElementById('touch-pause').addEventListener('click', () => {
  if (state === 'running') setState('paused');
});
overlay.addEventListener('pointerdown', handleAction);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'running') setState('paused');
});

fillStage(canvas, (newWidth, newHeight) => {
  if (width === 0) {
    width = newWidth;
    height = newHeight;
  }
  const scaleX = newWidth / width;
  const scaleY = newHeight / height;
  width = newWidth;
  height = newHeight;
  unit = Math.min(1, Math.max(0.6, Math.min(width, height) / 700));
  if (!ship) {
    stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), alpha: random(0.08, 0.35) }));
    newGame();
    setState('ready');
    requestAnimationFrame(frame);
    return;
  }
  for (const body of [ship, ...bullets, ...asteroids, ...debris, ...particles]) {
    body.x *= scaleX;
    body.y *= scaleY;
  }
  draw(); // redraw right away, a resized canvas is blank until the next frame
});
