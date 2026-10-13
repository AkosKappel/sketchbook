const PALETTE = ['#7aa7ff', '#5ee6a0', '#f5b942', '#ff7a90'];
const SHADES = 48;
const STIR_RADIUS = 140;

const stage = document.querySelector('.stage');
const countInput = document.getElementById('count');
const zoomInput = document.getElementById('zoom');
const fadeInput = document.getElementById('fade');

const speed = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.6 : 1.6;
let particles = [];
let shades = []; // the palette blended into SHADES steps, as CSS colors
let pointer = null;

function setup() {
  createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
  shades = Array.from({ length: SHADES }, (_, i) => {
    const t = (i / (SHADES - 1)) * (PALETTE.length - 1);
    const from = floor(min(t, PALETTE.length - 2));
    const blended = lerpColor(color(PALETTE[from]), color(PALETTE[from + 1]), t - from);
    blended.setAlpha(60);
    return blended.toString();
  });
  newField();

  new ResizeObserver(() => {
    if (stage.clientWidth === width && stage.clientHeight === height) return;
    resizeCanvas(stage.clientWidth, stage.clientHeight);
    newField();
  }).observe(stage);
  countInput.addEventListener('change', newField);
  document.getElementById('new-field').addEventListener('click', newField);

  const canvas = document.querySelector('canvas');
  const track = (event) => (pointer = { x: event.offsetX, y: event.offsetY });
  canvas.addEventListener('pointermove', track);
  canvas.addEventListener('pointerdown', track);
  canvas.addEventListener('pointerleave', () => (pointer = null));
  canvas.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'mouse') pointer = null;
  });
}

function newField() {
  noiseSeed(floor(random(1e9)));
  background(12, 17, 28);
  particles = Array.from({ length: Number(countInput.value) }, spawn);
}

function spawn() {
  return { x: random(width), y: random(height), life: random(80, 400) };
}

function draw() {
  if (fadeInput.checked) background(12, 17, 28, 14);

  const scale = Number(zoomInput.value) * 0.0008;
  const time = frameCount * 0.0015;
  // Lines are grouped by color and stroked once per color: thousands of separate strokes would be slow.
  const paths = Array.from({ length: SHADES }, () => new Path2D());

  for (const particle of particles) {
    const value = noise(particle.x * scale, particle.y * scale, time);
    // noise values cluster around 0.5, so two full turns spread the directions out
    let angle = value * TWO_PI * 2;
    if (pointer) {
      const distance = dist(particle.x, particle.y, pointer.x, pointer.y);
      // near the pointer the flow bends around it, turning the field into a whirlpool
      if (distance < STIR_RADIUS) angle += (1 - distance / STIR_RADIUS) * HALF_PI;
    }

    const x = particle.x + cos(angle) * speed;
    const y = particle.y + sin(angle) * speed;
    const shade = floor(constrain((value - 0.25) / 0.5, 0, 0.999) * SHADES);
    paths[shade].moveTo(particle.x, particle.y);
    paths[shade].lineTo(x, y);

    particle.x = x;
    particle.y = y;
    particle.life--;
    if (particle.life < 0 || x < 0 || x > width || y < 0 || y > height) Object.assign(particle, spawn());
  }

  drawingContext.lineWidth = 1.2;
  paths.forEach((path, i) => {
    drawingContext.strokeStyle = shades[i];
    drawingContext.stroke(path);
  });
}
