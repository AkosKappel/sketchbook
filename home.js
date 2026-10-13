// Hero sketch: the page title is rebuilt from particles that dodge the pointer.
const hero = document.querySelector('.hero');
const title = hero.querySelector('.hero-title');
const canvas = hero.querySelector('.hero-canvas');
const ctx = canvas.getContext('2d');

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// mostly the text color, with a sprinkle of the category colors
const palette = [...Array(24).fill('#e8ebf2'), ...CATEGORIES.map((category) => category.color)];
const pointer = { x: -9999, y: -9999, radius: 90 };

let particles = [];
let frame = null;
let visible = true;

class Particle {
  constructor(homeX, homeY, color) {
    this.homeX = homeX;
    this.homeY = homeY;
    this.x = reducedMotion ? homeX : Math.random() * canvas.clientWidth;
    this.y = reducedMotion ? homeY : Math.random() * canvas.clientHeight;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
  }

  // returns true while the particle is still moving
  update() {
    const dx = this.x - pointer.x;
    const dy = this.y - pointer.y;
    const distance = Math.hypot(dx, dy);
    if (distance < pointer.radius && distance > 0) {
      const push = (1 - distance / pointer.radius) * 6;
      this.vx += (dx / distance) * push;
      this.vy += (dy / distance) * push;
    }

    // spring back home with damping
    this.vx = (this.vx + (this.homeX - this.x) * 0.08) * 0.78;
    this.vy = (this.vy + (this.homeY - this.y) * 0.08) * 0.78;
    this.x += this.vx;
    this.y += this.vy;

    return Math.abs(this.vx) + Math.abs(this.vy) > 0.02 || Math.abs(this.homeX - this.x) > 0.3;
  }
}

const particleGap = () => (canvas.clientWidth < 640 ? 3 : 4);

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// Draws the title words exactly where the browser laid them out, then samples the filled pixels
function sampleTitle() {
  const heroRect = hero.getBoundingClientRect();
  const style = getComputedStyle(title);
  const width = canvas.clientWidth;
  const gap = particleGap();

  const scratch = document.createElement('canvas');
  scratch.width = width;
  scratch.height = canvas.clientHeight;
  const sctx = scratch.getContext('2d', { willReadFrequently: true });
  sctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  sctx.letterSpacing = style.letterSpacing;
  sctx.textBaseline = 'middle';
  sctx.fillStyle = '#fff';

  const text = title.firstChild;
  const words = text.textContent.split(' ');
  let offset = 0;
  for (const word of words) {
    const range = document.createRange();
    range.setStart(text, offset);
    range.setEnd(text, offset + word.length);
    const rect = range.getBoundingClientRect();
    sctx.fillText(word, rect.left - heroRect.left, rect.top - heroRect.top + rect.height / 2);
    offset += word.length + 1;
  }

  const data = sctx.getImageData(0, 0, scratch.width, scratch.height).data;
  const points = [];
  for (let y = 0; y < scratch.height; y += gap) {
    for (let x = 0; x < width; x += gap) {
      if (data[(y * width + x) * 4 + 3] > 128) {
        points.push([x, y]);
      }
    }
  }
  return points;
}

function build() {
  resizeCanvas();
  const points = sampleTitle();
  const previous = particles;
  particles = points.map(([x, y], i) => {
    const particle = new Particle(x, y, palette[Math.floor(Math.random() * palette.length)]);
    // on resize, start from where the old particles were instead of flying in again
    if (previous[i]) {
      particle.x = previous[i].x;
      particle.y = previous[i].y;
    }
    return particle;
  });
  hero.classList.add('is-drawn');
  start();
}

function draw() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  let moving = false;

  // group by color so each color is one fillStyle change
  const byColor = new Map();
  for (const particle of particles) {
    moving = particle.update() || moving;
    if (!byColor.has(particle.color)) byColor.set(particle.color, []);
    byColor.get(particle.color).push(particle);
  }

  const size = particleGap() - 1;
  for (const [color, group] of byColor) {
    ctx.fillStyle = color;
    for (const particle of group) {
      ctx.fillRect(particle.x, particle.y, size, size);
    }
  }

  // sleep once everything has settled; pointer movement wakes the loop up again
  frame = moving && visible && !document.hidden ? requestAnimationFrame(draw) : null;
}

function start() {
  if (frame === null) {
    frame = requestAnimationFrame(draw);
  }
}

hero.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  start();
});

hero.addEventListener('pointerleave', () => {
  pointer.x = -9999;
  pointer.y = -9999;
  start();
});

new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  if (visible) start();
}).observe(hero);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) start();
});

let resizeTimer;
new ResizeObserver(() => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(build, 150);
}).observe(hero);

document.fonts.ready.then(build);
