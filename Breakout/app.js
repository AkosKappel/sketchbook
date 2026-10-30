// One color per brick row, top to bottom.
const COLORS = ['#ff7a90', '#f5b942', '#5ee6a0', '#7aa7ff', '#c39bff'];
const COLS = 10;
const LIVES = 3;
const SERVE_WAIT = 45; // frames the ball rests on the paddle before it launches
const MAX_BOUNCE = Math.PI / 3; // steepest angle off the paddle edge, measured from straight up
const TRAIL_LENGTH = 8;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const outputs = {
  score: document.getElementById('score'),
  lives: document.getElementById('lives'),
  level: document.getElementById('level'),
  best: document.getElementById('best'),
};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

let width = 0;
let height = 0;
let state = 'ready'; // ready | running | paused | cleared | over
let score = 0;
let lives = LIVES;
let level = 1;
let best = loadBest();
let bricks = []; // { row, col, hp, maxHp }
let ball = { x: 0, y: 0, dx: 0, dy: -1, wait: 0, trail: [] }; // (dx, dy) is a unit direction
let paddleX = 0; // center of the paddle
let pointerX = null; // where the mouse or finger wants the paddle, null while the keys steer
let particles = []; // { x, y, vx, vy, life, color }
let shake = 0; // frames of screen shake left
const keys = new Set();

// Every size derives from the court, so a resize keeps the game playable.
const ballRadius = () => Math.max(5, Math.min(width, height) * 0.012);

// pixels per 60 fps frame, a little faster each level
const ballSpeed = () => Math.min(width, height) * 0.0095 * Math.min(1 + 0.08 * (level - 1), 1.6);

function paddleRect() {
  const w = Math.max(64, width * 0.14);
  const h = Math.max(10, height * 0.018);
  return { x: paddleX - w / 2, y: height - h - Math.max(24, height * 0.06), w, h };
}

function brickRect({ row, col }) {
  const margin = Math.max(8, width * 0.03);
  const gap = Math.max(3, width * 0.004);
  const w = (width - 2 * margin - (COLS - 1) * gap) / COLS;
  const h = Math.max(12, Math.min(height * 0.035, w * 0.5));
  const top = Math.max(16, height * 0.08);
  return { x: margin + col * (w + gap), y: top + row * (h + gap), w, h };
}

const clamp = (value, low, high) => Math.min(Math.max(value, low), high);

function newGame() {
  score = 0;
  lives = LIVES;
  level = 1;
  buildLevel();
  resetBall();
  showStats();
}

function buildLevel() {
  // from level 2 the top rows take more hits, one more row each level
  bricks = [];
  for (let row = 0; row < COLORS.length; row++) {
    const hp = row < level - 3 ? 3 : row < level - 1 ? 2 : 1;
    for (let col = 0; col < COLS; col++) bricks.push({ row, col, hp, maxHp: hp });
  }
}

function resetBall() {
  const angle = (Math.random() - 0.5) * (Math.PI / 3);
  ball = { x: paddleX, y: paddleRect().y - ballRadius(), dx: Math.sin(angle), dy: -Math.cos(angle), wait: SERVE_WAIT, trail: [] };
}

function update(step) {
  const direction = (keys.has('arrowright') || keys.has('d')) - (keys.has('arrowleft') || keys.has('a'));
  if (direction) {
    pointerX = null;
    paddleX += direction * width * 0.016 * step;
  } else if (pointerX !== null) {
    paddleX = pointerX;
  }
  const paddle = paddleRect();
  paddleX = clamp(paddleX, paddle.w / 2, width - paddle.w / 2);

  if (ball.wait > 0) {
    ball.wait -= step;
    ball.x = paddleX;
    ball.y = paddleRect().y - ballRadius();
    return;
  }

  // substeps of at most half a radius keep the ball from tunnelling through a brick or the paddle
  const distance = ballSpeed() * step;
  const substeps = Math.ceil(distance / (ballRadius() * 0.5));
  for (let i = 0; i < substeps && state === 'running' && ball.wait <= 0; i++) moveBall(distance / substeps);

  ball.trail.push([ball.x, ball.y]);
  if (ball.trail.length > TRAIL_LENGTH) ball.trail.shift();
}

function moveBall(distance) {
  const r = ballRadius();
  ball.x += ball.dx * distance;
  ball.y += ball.dy * distance;

  if (ball.x < r) ball.dx = Math.abs(ball.dx);
  if (ball.x > width - r) ball.dx = -Math.abs(ball.dx);
  if (ball.y < r) ball.dy = Math.abs(ball.dy);

  const paddle = paddleRect();
  if (
    ball.dy > 0 &&
    ball.y + r >= paddle.y &&
    ball.y - r <= paddle.y + paddle.h &&
    ball.x + r >= paddle.x &&
    ball.x - r <= paddle.x + paddle.w
  ) {
    // where the ball hits the paddle sets the angle: the edges send it off steeper
    const angle = clamp((ball.x - paddleX) / (paddle.w / 2), -1, 1) * MAX_BOUNCE;
    ball.dx = Math.sin(angle);
    ball.dy = -Math.cos(angle);
    ball.y = paddle.y - r;
  }

  for (const brick of bricks) {
    const rect = brickRect(brick);
    const nearestX = clamp(ball.x, rect.x, rect.x + rect.w);
    const nearestY = clamp(ball.y, rect.y, rect.y + rect.h);
    if ((ball.x - nearestX) ** 2 + (ball.y - nearestY) ** 2 >= r * r) continue;

    // the side with the smaller overlap is the one the ball came through; setting the sign from the
    // ball's position instead of flipping it means a hit can never bounce the ball into the brick
    const overlapX = Math.min(ball.x + r - rect.x, rect.x + rect.w - (ball.x - r));
    const overlapY = Math.min(ball.y + r - rect.y, rect.y + rect.h - (ball.y - r));
    if (overlapX < overlapY) {
      ball.dx = ball.x < rect.x + rect.w / 2 ? -Math.abs(ball.dx) : Math.abs(ball.dx);
    } else {
      ball.dy = ball.y < rect.y + rect.h / 2 ? -Math.abs(ball.dy) : Math.abs(ball.dy);
    }
    hitBrick(brick, rect);
    break;
  }

  if (ball.y - r > height) loseLife();
}

function hitBrick(brick, rect) {
  brick.hp--;
  if (brick.hp > 0) {
    score += 5;
  } else {
    score += 10 * level;
    bricks.splice(bricks.indexOf(brick), 1);
    burst(rect.x + rect.w / 2, rect.y + rect.h / 2, COLORS[brick.row]);
  }
  showStats();
  if (!bricks.length) {
    setState('cleared');
    celebrateOver(canvas);
  }
}

function loseLife() {
  lives--;
  if (!reducedMotion.matches) shake = 18;
  showStats();
  if (lives === 0) setState('over');
  else resetBall();
}

function burst(x, y, color) {
  if (reducedMotion.matches) return;
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color });
  }
}

function updateEffects(step) {
  for (const particle of particles) {
    particle.vy += 0.12 * step;
    particle.x += particle.vx * step;
    particle.y += particle.vy * step;
    particle.life -= 0.025 * step;
  }
  particles = particles.filter((particle) => particle.life > 0);
  shake = Math.max(0, shake - step);
}

function draw() {
  ctx.fillStyle = 'rgb(22, 27, 38)';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  if (shake > 0) {
    const amount = shake * 0.5;
    ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
  }

  for (const brick of bricks) {
    const rect = brickRect(brick);
    ctx.fillStyle = COLORS[brick.row];
    ctx.globalAlpha = brick.hp < brick.maxHp ? 0.7 : 1;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 3);
    ctx.fill();
    // one white inset ring per extra hit the brick can still take
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgb(255 255 255 / 0.75)';
    ctx.lineWidth = 1.5;
    for (let ring = 1; ring < brick.hp; ring++) {
      const inset = ring * 3.5;
      ctx.strokeRect(rect.x + inset, rect.y + inset, rect.w - 2 * inset, rect.h - 2 * inset);
    }
  }

  const paddle = paddleRect();
  ctx.fillStyle = '#e8ebf2';
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, paddle.h / 2);
  ctx.fill();

  const r = ballRadius();
  ball.trail.forEach(([x, y], i) => {
    ctx.globalAlpha = ((i + 1) / ball.trail.length) * 0.25;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
  ctx.fill();

  for (const particle of particles) {
    ctx.globalAlpha = particle.life;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
  }
  ctx.restore();
}

let lastFrame = performance.now();
function animate(now) {
  // steps are in 60 fps frames, so the game runs at the same speed on faster screens
  const step = Math.min((now - lastFrame) / 16.7, 3);
  lastFrame = now;
  if (width) {
    if (state === 'running') update(step);
    updateEffects(step);
    draw();
  }
  requestAnimationFrame(animate);
}

function showStats() {
  if (score > best) {
    best = score;
    saveBest(best);
  }
  outputs.score.value = score;
  outputs.lives.value = lives;
  outputs.level.value = level;
  outputs.best.value = best;
}

function setState(next) {
  state = next;
  const messages = {
    ready: ['Breakout', 'Clear every brick. Press Space or tap to start'],
    paused: ['Paused', 'Press Space or tap to continue'],
    cleared: [`Level ${level} cleared`, 'Press Space or tap for the next level'],
    over: ['Game over', `Score ${score}. Press Space or tap to play again`],
  };
  overlay.hidden = state === 'running';
  if (messages[state]) [overlayTitle.textContent, overlayText.textContent] = messages[state];
}

function handleAction() {
  if (state === 'running') {
    setState('paused');
    return;
  }
  if (state === 'over') newGame();
  if (state === 'cleared') {
    level++;
    buildLevel();
    resetBall();
    showStats();
  }
  setState('running');
}

function loadBest() {
  try {
    return Number(localStorage.getItem('breakout-best')) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem('breakout-best', value);
  } catch {
    // storage unavailable (private mode), the best score just isn't kept
  }
}

const STEER_KEYS = ['arrowleft', 'arrowright', 'a', 'd'];
document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === ' ') {
    event.preventDefault(); // keep Space from scrolling or clicking a focused link
    if (!event.repeat) handleAction();
  } else if (STEER_KEYS.includes(key)) {
    event.preventDefault();
    keys.add(key);
  }
});
document.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

canvas.addEventListener('pointerdown', (event) => {
  canvas.setPointerCapture(event.pointerId);
  pointerX = event.offsetX;
});
canvas.addEventListener('pointermove', (event) => {
  pointerX = event.offsetX;
});
overlay.addEventListener('pointerdown', handleAction);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'running') setState('paused');
});

fillStage(canvas, (w, h) => {
  const firstSize = !width;
  if (!firstSize) {
    ball.x *= w / width;
    ball.y *= h / height;
    paddleX *= w / width;
    if (pointerX !== null) pointerX *= w / width;
  }
  width = w;
  height = h;
  ball.trail = [];
  particles = [];
  if (firstSize) {
    paddleX = width / 2;
    newGame();
  }
});
requestAnimationFrame(animate);
