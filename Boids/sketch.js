const maxSpeed = 15;
const minDistance = 20; // separation only reacts to boids closer than this
const trailLength = 40;
const pointerRange = 120;

const settings = {};
let boids = [];
let pointer = null; // pointer position in canvas coordinates, null when outside

const inputs = ['cohesion', 'separation', 'alignment', 'vision', 'count'].map((id) => document.getElementById(id));
const trailsInput = document.getElementById('trails');

function setup() {
  const stage = document.querySelector('.stage');
  const canvas = createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
  new ResizeObserver(() => resizeCanvas(stage.clientWidth, stage.clientHeight)).observe(stage);

  for (const input of inputs) input.addEventListener('input', readSettings);
  readSettings();
  setupPointer(canvas.elt);
}

function readSettings() {
  for (const input of inputs) settings[input.id] = Number(input.value);
  while (boids.length < settings.count) boids.push(new Boid());
  boids.length = settings.count;
}

function draw() {
  background(16, 20, 28);

  for (const boid of boids) boid.update(boids);

  if (trailsInput.checked) {
    // all trails go into one canvas path, one stroke call is far cheaper than a p5 shape per boid
    const ctx = drawingContext;
    ctx.beginPath();
    for (const boid of boids) boid.traceTrail(ctx);
    ctx.strokeStyle = 'rgb(85 140 244 / 0.27)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  noStroke();
  fill(85, 140, 244);
  for (const boid of boids) boid.show();
}

function setupPointer(canvas) {
  const track = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer = createVector(event.clientX - rect.left, event.clientY - rect.top);
  };
  const release = () => (pointer = null);

  canvas.addEventListener('pointerdown', track);
  canvas.addEventListener('pointermove', track);
  canvas.addEventListener('pointerleave', release);
  // a lifted finger should not keep scaring the flock
  canvas.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'mouse') release();
  });
  canvas.addEventListener('pointercancel', release);
}
