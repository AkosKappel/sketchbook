const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const patternSelect = document.getElementById('pattern');
const speedInput = document.getElementById('speed');
const pauseButton = document.getElementById('pause');

// Gray-Scott model: feed rate f adds chemical A, kill rate k removes B. These pairs give distinct patterns.
const PATTERNS = {
  coral: { f: 0.0545, k: 0.062 },
  mitosis: { f: 0.0367, k: 0.0649 },
  worms: { f: 0.078, k: 0.061 },
  maze: { f: 0.029, k: 0.057 },
};
const DIFFUSION_A = 1;
const DIFFUSION_B = 0.5;
const TARGET_CELLS = 50000; // keeps a frame of several steps fast on any screen size

let cols = 0;
let rows = 0;
let cellSize = 1; // CSS pixels per cell
let a = new Float32Array(0);
let b = new Float32Array(0);
let nextA = new Float32Array(0);
let nextB = new Float32Array(0);
let paused = false;

// The grid is drawn one pixel per cell into this small canvas, then scaled up with smoothing.
const pixels = document.createElement('canvas');
const pixelsContext = pixels.getContext('2d');
let image = null;

// Color lookup from "no B" (background) to "lots of B" (bright).
const colors = new Uint8ClampedArray(256 * 3);
const STOPS = [
  [0, [12, 17, 28]],
  [0.45, [59, 92, 170]],
  [1, [94, 230, 160]],
];
for (let i = 0; i < 256; i++) {
  const t = i / 255;
  const upper = STOPS.findIndex(([position]) => position >= t);
  const [p0, c0] = STOPS[Math.max(upper - 1, 0)];
  const [p1, c1] = STOPS[upper];
  const mix = p1 === p0 ? 0 : (t - p0) / (p1 - p0);
  for (let channel = 0; channel < 3; channel++) colors[i * 3 + channel] = c0[channel] + (c1[channel] - c0[channel]) * mix;
}

function reset() {
  a = new Float32Array(cols * rows).fill(1);
  b = new Float32Array(cols * rows);
  nextA = new Float32Array(cols * rows);
  nextB = new Float32Array(cols * rows);
  // a few random drops of B to start the reaction
  for (let i = 0; i < 14; i++) addDrop(Math.random() * cols, Math.random() * rows, 4);
}

// Keeps the pattern centered on a grid of the new size, cropping or padding with plain A at the edges.
function resizeGrid(newCols, newRows) {
  const offsetX = Math.floor((newCols - cols) / 2);
  const offsetY = Math.floor((newRows - rows) / 2);
  const resizedA = new Float32Array(newCols * newRows).fill(1);
  const resizedB = new Float32Array(newCols * newRows);
  for (let y = Math.max(0, -offsetY); y < Math.min(rows, newRows - offsetY); y++) {
    for (let x = Math.max(0, -offsetX); x < Math.min(cols, newCols - offsetX); x++) {
      resizedA[(y + offsetY) * newCols + x + offsetX] = a[y * cols + x];
      resizedB[(y + offsetY) * newCols + x + offsetX] = b[y * cols + x];
    }
  }
  [a, b, cols, rows] = [resizedA, resizedB, newCols, newRows];
  nextA = new Float32Array(cols * rows);
  nextB = new Float32Array(cols * rows);
}

function addDrop(cx, cy, radius) {
  for (let y = Math.floor(cy - radius); y <= cy + radius; y++) {
    for (let x = Math.floor(cx - radius); x <= cx + radius; x++) {
      if (Math.hypot(x - cx, y - cy) > radius) continue;
      b[((y + rows) % rows) * cols + ((x + cols) % cols)] = 1;
    }
  }
}

// One step: each chemical spreads to its neighbours (the Laplacian), A turns into B where they meet (A·B²),
// A is fed in and B is removed. The edges wrap around.
function step() {
  const { f, k } = PATTERNS[patternSelect.value];
  for (let y = 0; y < rows; y++) {
    const up = ((y - 1 + rows) % rows) * cols;
    const row = y * cols;
    const down = ((y + 1) % rows) * cols;
    for (let x = 0; x < cols; x++) {
      const left = x === 0 ? cols - 1 : x - 1;
      const right = x === cols - 1 ? 0 : x + 1;
      const i = row + x;
      // 3×3 kernel: -1 center, 0.2 sides, 0.05 corners
      const laplaceA =
        0.2 * (a[up + x] + a[down + x] + a[row + left] + a[row + right]) +
        0.05 * (a[up + left] + a[up + right] + a[down + left] + a[down + right]) -
        a[i];
      const laplaceB =
        0.2 * (b[up + x] + b[down + x] + b[row + left] + b[row + right]) +
        0.05 * (b[up + left] + b[up + right] + b[down + left] + b[down + right]) -
        b[i];
      const reaction = a[i] * b[i] * b[i];
      nextA[i] = a[i] + DIFFUSION_A * laplaceA - reaction + f * (1 - a[i]);
      nextB[i] = b[i] + DIFFUSION_B * laplaceB + reaction - (k + f) * b[i];
    }
  }
  [a, nextA] = [nextA, a];
  [b, nextB] = [nextB, b];
}

function draw() {
  const data = image.data;
  for (let i = 0; i < b.length; i++) {
    const index = Math.min(255, Math.max(0, Math.round(255 * (1 - a[i] + b[i])))) * 3;
    data[i * 4] = colors[index];
    data[i * 4 + 1] = colors[index + 1];
    data[i * 4 + 2] = colors[index + 2];
    data[i * 4 + 3] = 255;
  }
  pixelsContext.putImageData(image, 0, 0);
  ctx.drawImage(pixels, 0, 0, cols * cellSize, rows * cellSize);
}

function animate() {
  // the stage is sized (and the grid created) by the first resize callback
  if (!image) return requestAnimationFrame(animate);
  if (!paused) {
    // at most `speed` steps, within a frame budget so slow devices keep a smooth frame rate
    const count = Number(speedInput.value);
    const deadline = performance.now() + 12;
    for (let i = 0; i < count && performance.now() < deadline; i++) step();
  }
  draw();
  requestAnimationFrame(animate);
}

let drawing = false;
function drawAt(event) {
  const rect = canvas.getBoundingClientRect();
  addDrop((event.clientX - rect.left) / cellSize, (event.clientY - rect.top) / cellSize, 3);
}
canvas.addEventListener('pointerdown', (event) => {
  canvas.setPointerCapture(event.pointerId);
  drawing = true;
  drawAt(event);
});
canvas.addEventListener('pointermove', (event) => drawing && drawAt(event));
canvas.addEventListener('pointerup', () => (drawing = false));
canvas.addEventListener('pointercancel', () => (drawing = false));

patternSelect.addEventListener('change', reset);
document.getElementById('reset').addEventListener('click', reset);
pauseButton.addEventListener('click', () => {
  paused = !paused;
  pauseButton.textContent = paused ? 'Play' : 'Pause';
});

// The cell size is picked once, so a resize (rotating a phone) only adds or removes cells at the edges.
fillStage(canvas, (width, height) => {
  if (!image) cellSize = Math.max(2, Math.sqrt((width * height) / TARGET_CELLS));
  const newCols = Math.ceil(width / cellSize);
  const newRows = Math.ceil(height / cellSize);
  if (image) {
    resizeGrid(newCols, newRows);
  } else {
    [cols, rows] = [newCols, newRows];
    reset();
  }
  pixels.width = cols;
  pixels.height = rows;
  image = pixelsContext.createImageData(cols, rows);
});
requestAnimationFrame(animate);
