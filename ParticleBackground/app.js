const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const stage = canvas.parentElement;

const connectDistance = 120;
const maxParticles = 160;
const repelStep = 5;
const speed = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.3 : 1;

const pointer = { x: 0, y: 0, active: false, radius: 0 };
let width = 0;
let height = 0;
let particles = [];

class Particle {
  constructor() {
    this.size = Math.random() * 3 + 1;
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.directionX = (Math.random() * 3 - 1.5) * speed;
    this.directionY = (Math.random() * 3 - 1.5) * speed;
  }

  update() {
    if (this.x < 0 || this.x > width) this.directionX = -this.directionX;
    if (this.y < 0 || this.y > height) this.directionY = -this.directionY;

    if (pointer.active) {
      const dx = this.x - pointer.x;
      const dy = this.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0 && distance < pointer.radius + this.size) {
        this.x = Math.min(Math.max(this.x + (dx / distance) * repelStep, 0), width);
        this.y = Math.min(Math.max(this.y + (dy / distance) * repelStep, 0), height);
      }
    }

    this.x += this.directionX;
    this.y += this.directionY;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function connect() {
  ctx.lineWidth = 1;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i];
      const b = particles[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance < connectDistance) {
        ctx.strokeStyle = `rgb(96 165 250 / ${1 - distance / connectDistance})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = stage.clientWidth;
  height = stage.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  pointer.radius = Math.max(80, Math.min(width, height) / 5);
  const count = Math.min(Math.round((width * height) / 9000), maxParticles);
  particles = Array.from({ length: count }, () => new Particle());
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  for (const particle of particles) particle.update();
  connect();
  ctx.fillStyle = '#6ee7b7';
  for (const particle of particles) particle.draw();
  requestAnimationFrame(animate);
}

function trackPointer(event) {
  pointer.x = event.offsetX;
  pointer.y = event.offsetY;
  pointer.active = true;
}

canvas.addEventListener('pointermove', trackPointer);
canvas.addEventListener('pointerdown', trackPointer);
canvas.addEventListener('pointerleave', () => {
  pointer.active = false;
});

new ResizeObserver(resize).observe(stage);
requestAnimationFrame(animate);
