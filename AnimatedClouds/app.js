const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const colors = ['#ffffff', 'rgb(255 255 255 / 0.3)', 'rgb(173 216 230 / 0.8)', 'rgb(211 211 211 / 0.8)'];
const maxSize = 40;
const growth = 3;
const shrink = 0.3;
const pointerRadius = 60;
// Clouds only grow while the pointer moves; an idle pointer lets them fade away.
const pointerIdleMs = 1000;

const pointer = { x: 0, y: 0, active: false, lastMove: 0 };
let width = 0;
let height = 0;
let sky;
let particles = [];

class Particle {
  constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.directionX = Math.random() * 0.2 - 0.1;
    this.directionY = Math.random() * 0.2 - 0.1;
    this.size = 0;
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update(pointerActive) {
    if (this.x < 0 || this.x > width) this.directionX = -this.directionX;
    if (this.y < 0 || this.y > height) this.directionY = -this.directionY;
    this.x += this.directionX;
    this.y += this.directionY;

    const dx = pointer.x - this.x;
    const dy = pointer.y - this.y;
    if (pointerActive && dx * dx + dy * dy < pointerRadius * pointerRadius) {
      this.size = Math.min(this.size + growth, maxSize);
    } else {
      this.size = Math.max(this.size - shrink, 0);
    }
  }

  draw() {
    if (this.size === 0) return;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

function resize(stageWidth, stageHeight) {
  width = stageWidth;
  height = stageHeight;
  sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#0b0d12');
  sky.addColorStop(1, '#1f3354');

  const count = Math.min(Math.round((width * height) / 1500), 1500);
  particles = Array.from({ length: count }, () => new Particle());
}

function animate(time) {
  const pointerActive = pointer.active && time - pointer.lastMove < pointerIdleMs;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  for (const particle of particles) {
    particle.update(pointerActive);
    particle.draw();
  }
  requestAnimationFrame(animate);
}

function trackPointer(event) {
  pointer.x = event.offsetX;
  pointer.y = event.offsetY;
  pointer.active = true;
  pointer.lastMove = event.timeStamp;
}

canvas.addEventListener('pointermove', trackPointer);
canvas.addEventListener('pointerdown', trackPointer);
canvas.addEventListener('pointerleave', () => {
  pointer.active = false;
});

fillStage(canvas, resize);
requestAnimationFrame(animate);
