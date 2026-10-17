const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const copiesInput = document.getElementById('copies');
const trailsInput = document.getElementById('trails');
const pauseButton = document.getElementById('pause');
const timeOutput = document.getElementById('time');

const G = 9.81;
const DT = 1 / 240; // fixed physics step in seconds, small enough for RK4 to stay stable
const SPREAD = (0.001 * Math.PI) / 180; // the copies start this far apart
const TRAIL_LENGTH = 160;

let width = 0;
let height = 0;
let scale = 0; // pixels per arm length
let start = [0, 0]; // starting angles of the first copy, radians from straight down
let pendulums = []; // { state: [θ1, θ2, ω1, ω2], trail: [[x, y], ...], color }
let time = 0;
let paused = false;
let grabbed = null; // 0 or 1 while a bob is being dragged

// Equations of motion for two equal masses on two arms of equal length.
function derivatives([a1, a2, w1, w2]) {
  const delta = a1 - a2;
  const denominator = 3 - Math.cos(2 * delta);
  const alpha1 =
    (-3 * G * Math.sin(a1) - G * Math.sin(a1 - 2 * a2) - 2 * Math.sin(delta) * (w2 * w2 + w1 * w1 * Math.cos(delta))) /
    denominator;
  const alpha2 =
    (2 * Math.sin(delta) * (2 * w1 * w1 + 2 * G * Math.cos(a1) + w2 * w2 * Math.cos(delta))) / denominator;
  return [w1, w2, alpha1, alpha2];
}

// One fourth-order Runge-Kutta step: much more accurate than plain Euler for the same step size.
function step(state) {
  const add = (a, b, factor) => a.map((value, i) => value + b[i] * factor);
  const k1 = derivatives(state);
  const k2 = derivatives(add(state, k1, DT / 2));
  const k3 = derivatives(add(state, k2, DT / 2));
  const k4 = derivatives(add(state, k3, DT));
  return state.map((value, i) => value + (DT / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

function positions([a1, a2]) {
  const x1 = width / 2 + Math.sin(a1) * scale;
  const y1 = height / 2 + Math.cos(a1) * scale;
  return [x1, y1, x1 + Math.sin(a2) * scale, y1 + Math.cos(a2) * scale];
}

function reset() {
  const count = Number(copiesInput.value);
  time = 0;
  pendulums = Array.from({ length: count }, (_, i) => ({
    state: [start[0] + i * SPREAD, start[1], 0, 0],
    trail: [],
    color: `hsl(${(i / count) * 300 + 30} 85% 65%)`,
  }));
}

function randomStart() {
  // high starts (arms well above horizontal) are where the chaos shows quickly
  start = [Math.PI * (0.55 + Math.random() * 0.4), Math.PI * (0.4 + Math.random() * 1.2)];
  reset();
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (trailsInput.checked) {
    ctx.lineWidth = 1.5;
    for (const { trail, color } of pendulums) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // draw the first copy last so it sits on top
  for (const { state, color } of [...pendulums].reverse()) {
    const [x1, y1, x2, y2] = positions(state);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, height / 2);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.fillStyle = color;
    for (const [x, y] of [
      [x1, y1],
      [x2, y2],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = '#e8ebf2';
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 4, 0, Math.PI * 2);
  ctx.fill();
}

let lastFrame = performance.now();
let pending = 0; // simulated time owed to the physics, so the speed doesn't depend on the frame rate
function animate(now) {
  pending += Math.min((now - lastFrame) / 1000, 1 / 30);
  lastFrame = now;
  if (paused || grabbed !== null) pending = 0;

  for (; pending >= DT; pending -= DT) {
    for (const pendulum of pendulums) pendulum.state = step(pendulum.state);
    time += DT;
  }
  for (const pendulum of pendulums) {
    const [, , x2, y2] = positions(pendulum.state);
    pendulum.trail.push([x2, y2]);
    if (pendulum.trail.length > TRAIL_LENGTH) pendulum.trail.shift();
  }
  timeOutput.value = `${time.toFixed(1)} s`;
  draw();
  requestAnimationFrame(animate);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return [event.clientX - rect.left, event.clientY - rect.top];
}

canvas.addEventListener('pointerdown', (event) => {
  const [px, py] = canvasPoint(event);
  const [x1, y1, x2, y2] = positions(pendulums[0].state);
  const distances = [Math.hypot(px - x1, py - y1), Math.hypot(px - x2, py - y2)];
  const nearest = distances[0] < distances[1] ? 0 : 1;
  if (distances[nearest] > 40) return;
  canvas.setPointerCapture(event.pointerId);
  grabbed = nearest;
  start = pendulums[0].state.slice(0, 2);
});
canvas.addEventListener('pointermove', (event) => {
  if (grabbed === null) return;
  const [px, py] = canvasPoint(event);
  const [x1, y1] = positions(start);
  // a dragged bob points its arm at the pointer; the inner arm turns around the pivot, the outer around the inner bob
  const [ox, oy] = grabbed === 0 ? [width / 2, height / 2] : [x1, y1];
  start[grabbed] = Math.atan2(px - ox, py - oy);
  reset();
});
const release = () => {
  grabbed = null;
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

copiesInput.addEventListener('input', reset);
document.getElementById('restart').addEventListener('click', randomStart);
pauseButton.addEventListener('click', () => {
  paused = !paused;
  pauseButton.textContent = paused ? 'Play' : 'Pause';
});

fillStage(canvas, (w, h) => {
  width = w;
  height = h;
  scale = (Math.min(w, h) / 2 - 16) / 2;
  for (const pendulum of pendulums) pendulum.trail = [];
});
randomStart();
requestAnimationFrame(animate);
