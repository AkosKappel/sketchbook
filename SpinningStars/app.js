const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const stage = canvas.parentElement;

const ringCount = 100;
const speed = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.3 : 1;
let width = 0;
let height = 0;
let rings = [];

class Ring {
  constructor() {
    // Up to half the diagonal, so the orbits reach every corner.
    this.orbitRadius = (Math.random() * Math.hypot(width, height)) / 2;
    this.step = (Math.random() * 0.002 + 0.002) * speed;
    this.angle = Math.random() * Math.PI * 2;
    this.color = Math.random() < 0.2 ? '#f5b942' : '#e8ebf2';
  }

  update() {
    this.angle += this.step;
  }

  draw() {
    const x = Math.cos(this.angle) * this.orbitRadius + width / 2;
    const y = Math.sin(this.angle) * this.orbitRadius + height / 2;
    ctx.beginPath();
    ctx.arc(x, y, this.orbitRadius / 10, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.stroke();
  }
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  width = stage.clientWidth;
  height = stage.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rings = Array.from({ length: ringCount }, () => new Ring());
}

function animate() {
  // A translucent fill instead of a clear leaves fading trails behind the rings.
  ctx.fillStyle = 'rgb(11 13 18 / 0.07)';
  ctx.fillRect(0, 0, width, height);
  for (const ring of rings) {
    ring.update();
    ring.draw();
  }
  requestAnimationFrame(animate);
}

new ResizeObserver(resize).observe(stage);
requestAnimationFrame(animate);
