const SIZE = 900;
const MARGIN = 24;
const POINT_ALPHA = 90;
// the first jumps land between the start and the attractor, so they are not drawn
const WARMUP_STEPS = 20;
const PALETTE = [
  '#f5b942',
  '#5ee6a0',
  '#558cf4',
  '#ff5c6c',
  '#b38cff',
  '#4fd6e0',
  '#ff9b5e',
  '#f27ec2',
  '#a8e05f',
  '#8fa6ff',
];
const PRESETS = {
  sierpinski: { vertexCount: 3, ratio: 0.5, canRepeat: true },
  square: { vertexCount: 4, ratio: 0.5, canRepeat: false },
  pentagon: { vertexCount: 5, ratio: 0.618, canRepeat: true },
  hexagon: { vertexCount: 6, ratio: 0.667, canRepeat: true },
};

const presetSelect = document.getElementById('preset');
const vertexCountSelect = document.getElementById('vertex-count');
const ratioInput = document.getElementById('ratio');
const ratioOutput = document.getElementById('ratio-value');
const canRepeatInput = document.getElementById('can-repeat');
const useColorsInput = document.getElementById('use-colors');
const speedInput = document.getElementById('speed');
const pauseButton = document.getElementById('pause');
const restartButton = document.getElementById('restart');
const pointsOutput = document.getElementById('points');

let vertices;
let current;
let previousVertex;
let steps;
let paused = false;
let plainColor;

function setup() {
  const canvas = createCanvas(SIZE, SIZE);
  canvas.parent(document.querySelector('.stage'));
  fitCanvas(canvas.elt, SIZE, SIZE);
  plainColor = color(232, 235, 242, POINT_ALPHA);

  presetSelect.addEventListener('change', applyPreset);
  for (const input of [vertexCountSelect, ratioInput, canRepeatInput, useColorsInput]) {
    input.addEventListener('input', () => {
      presetSelect.value = matchingPreset();
      restart();
    });
  }
  pauseButton.addEventListener('click', () => setPaused(!paused));
  restartButton.addEventListener('click', restart);

  presetSelect.value = matchingPreset();
  restart();
}

function draw() {
  const useColors = useColorsInput.checked;
  const count = Number(speedInput.value);

  for (let i = 0; i < count; i++) {
    const vertex = nextVertex();
    current.lerp(vertex.position, Number(ratioInput.value));
    previousVertex = vertex;
    steps++;

    if (steps > WARMUP_STEPS) {
      stroke(useColors ? vertex.color : plainColor);
      point(current.x, current.y);
    }
  }

  pointsOutput.value = max(0, steps - WARMUP_STEPS).toLocaleString('en-US');
}

function nextVertex() {
  let vertex = random(vertices);
  while (!canRepeatInput.checked && vertex === previousVertex) {
    vertex = random(vertices);
  }
  return vertex;
}

function restart() {
  ratioOutput.value = Number(ratioInput.value).toFixed(3);
  background(16, 20, 28);

  // size and center the polygon by its bounding box, odd polygons are not symmetric vertically
  const count = Number(vertexCountSelect.value);
  const angles = Array.from({ length: count }, (_, i) => (i * TWO_PI) / count - HALF_PI);
  const bottom = max(angles.map(sin));
  const side = max(angles.map(cos));
  const radius = min((SIZE - 2 * MARGIN) / (1 + bottom), (SIZE - 2 * MARGIN) / (2 * side));
  const center = createVector(SIZE / 2, SIZE / 2 + (radius * (1 - bottom)) / 2);

  vertices = [];
  strokeWeight(10);
  for (const angle of angles) {
    const position = p5.Vector.fromAngle(angle, radius).add(center);
    const vertexColor = color(PALETTE[vertices.length]);

    stroke(useColorsInput.checked ? vertexColor : 'white');
    point(position.x, position.y);

    vertexColor.setAlpha(POINT_ALPHA);
    vertices.push({ position, color: vertexColor });
  }
  strokeWeight(1);

  current = createVector(random(width), random(height));
  previousVertex = null;
  steps = 0;
  pointsOutput.value = 0;
  setPaused(false);
}

function setPaused(value) {
  paused = value;
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
  if (paused) noLoop();
  else loop();
}

function applyPreset() {
  const preset = PRESETS[presetSelect.value];
  if (!preset) return;
  vertexCountSelect.value = preset.vertexCount;
  ratioInput.value = preset.ratio;
  canRepeatInput.checked = preset.canRepeat;
  restart();
}

function matchingPreset() {
  const match = Object.entries(PRESETS).find(
    ([, preset]) =>
      preset.vertexCount === Number(vertexCountSelect.value) &&
      preset.ratio === Number(ratioInput.value) &&
      preset.canRepeat === canRepeatInput.checked,
  );
  return match ? match[0] : '';
}
