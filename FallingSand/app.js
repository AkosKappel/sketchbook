const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const brushInput = document.getElementById('brush');
const pauseButton = document.getElementById('pause');
const countOutput = document.getElementById('count');
const materialButtons = document.querySelectorAll('[data-material]');

const CELL = 4; // CSS pixels per grid cell
const STEP = 1 / 60; // simulation steps per second stay the same on 120 Hz screens
const BACKGROUND = [22, 27, 38];

// Cell types. BURNING is wood on fire; it can't be painted, only lit.
const EMPTY = 0;
const SAND = 1;
const WATER = 2;
const STONE = 3;
const WOOD = 4;
const FIRE = 5;
const BURNING = 6;

let cols = 0;
let rows = 0;
let width = 0;
let height = 0;
let cells = new Uint8Array(0); // material per cell
let shades = new Uint8Array(0); // color variation per cell, or remaining life for fire and burning wood
let moved = new Uint8Array(0); // set when a cell has already moved this step
let paused = false;
let material = SAND;

// Off-screen buffer with one pixel per cell, drawn scaled up onto the visible canvas.
const buffer = document.createElement('canvas');
const bufferCtx = buffer.getContext('2d');
let image = null;
let pixels = null; // Uint32 view on the image data, one packed RGBA value per cell

const pack = ([r, g, b]) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; // ImageData is little-endian RGBA
const mix = (a, b, t) => a.map((value, i) => Math.round(value + (b[i] - value) * t));

// Color lookup: palette[material * 256 + shade], so drawing a frame is one table read per cell.
const palette = new Uint32Array(7 * 256);
for (let s = 0; s < 256; s++) {
  const t = s / 255;
  const tint = (rgb) => pack(rgb.map((c) => Math.min(255, Math.round(c * (0.82 + t * 0.3)))));
  palette[EMPTY * 256 + s] = pack(BACKGROUND);
  palette[SAND * 256 + s] = tint([245, 185, 66]);
  palette[WATER * 256 + s] = pack(mix([86, 130, 235], [122, 167, 255], t));
  palette[STONE * 256 + s] = tint([112, 120, 138]);
  palette[WOOD * 256 + s] = tint([150, 102, 66]);
  // fire fades from yellow to deep red as its life runs out
  palette[FIRE * 256 + s] = pack(mix([200, 50, 40], [255, 220, 110], Math.min(s / 40, 1)));
  // burning wood life drops every few steps; a scrambled index makes it flicker as it does
  palette[BURNING * 256 + s] = pack(mix([120, 40, 25], [255, 140, 60], ((s * 73) % 256) / 255));
}

function resize(newCols, newRows) {
  const oldCells = cells;
  const oldShades = shades;
  const oldCols = cols;
  const oldRows = rows;
  cells = new Uint8Array(newCols * newRows);
  shades = new Uint8Array(newCols * newRows);
  moved = new Uint8Array(newCols * newRows);
  // keep the old content, anchored to the floor, so a resize or rotation doesn't wipe the drawing
  const shift = newRows - oldRows;
  for (let y = 0; y < newRows; y++) {
    const oldY = y - shift;
    if (oldY < 0 || oldY >= oldRows) continue;
    for (let x = 0; x < Math.min(newCols, oldCols); x++) {
      cells[y * newCols + x] = oldCells[oldY * oldCols + x];
      shades[y * newCols + x] = oldShades[oldY * oldCols + x];
    }
  }
  cols = newCols;
  rows = newRows;
  buffer.width = cols;
  buffer.height = rows;
  image = bufferCtx.createImageData(cols, rows);
  pixels = new Uint32Array(image.data.buffer);
}

function at(x, y) {
  return x < 0 || x >= cols || y < 0 || y >= rows ? STONE : cells[y * cols + x];
}

function swap(i, j) {
  const cell = cells[i];
  const shade = shades[i];
  cells[i] = cells[j];
  shades[i] = shades[j];
  cells[j] = cell;
  shades[j] = shade;
  moved[i] = 1;
  moved[j] = 1;
}

function set(i, type, shade) {
  cells[i] = type;
  shades[i] = shade;
  moved[i] = 1;
}

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function updateSand(x, y, i) {
  const below = at(x, y + 1);
  // sand sinks through water by trading places with it
  if (below === EMPTY || below === WATER) return swap(i, i + cols);
  const dir = Math.random() < 0.5 ? -1 : 1;
  for (const dx of [dir, -dir]) {
    const side = at(x + dx, y + 1);
    if (side === EMPTY || side === WATER) return swap(i, i + cols + dx);
  }
}

function updateWater(x, y, i) {
  if (at(x, y + 1) === EMPTY) return swap(i, i + cols);
  const dir = Math.random() < 0.5 ? -1 : 1;
  for (const dx of [dir, -dir]) {
    if (at(x + dx, y + 1) === EMPTY) return swap(i, i + cols + dx);
  }
  // flow up to three cells sideways so puddles level out quickly
  for (const dx of [dir, -dir]) {
    let reach = 0;
    while (reach < 3 && at(x + dx * (reach + 1), y) === EMPTY) reach++;
    if (reach) return swap(i, i + dx * reach);
  }
}

function updateFire(x, y, i) {
  for (const [dx, dy] of NEIGHBORS) {
    const neighbor = at(x + dx, y + dy);
    if (neighbor === WATER) return set(i, EMPTY, 0);
    if (neighbor === WOOD && Math.random() < 0.08) set(i + dy * cols + dx, BURNING, 150 + Math.random() * 105);
  }
  if (--shades[i] === 0) return set(i, EMPTY, 0);
  if (Math.random() < 0.7) {
    const dx = Math.floor(Math.random() * 3) - 1;
    if (at(x + dx, y - 1) === EMPTY) swap(i, i - cols + dx);
  }
}

function updateBurning(x, y, i) {
  for (const [dx, dy] of NEIGHBORS) {
    const neighbor = at(x + dx, y + dy);
    if (neighbor === WATER) return set(i, WOOD, Math.random() * 256);
    if (neighbor === WOOD && Math.random() < 0.015) set(i + dy * cols + dx, BURNING, 150 + Math.random() * 105);
  }
  if (at(x, y - 1) === EMPTY && Math.random() < 0.25) set(i - cols, FIRE, 15 + Math.random() * 25);
  if (Math.random() < 0.4 && --shades[i] === 0) set(i, EMPTY, 0);
}

function step() {
  moved.fill(0);
  // bottom to top so a falling grain is never processed twice on the way down,
  // alternating scan direction per row so piles don't lean to one side
  for (let y = rows - 1; y >= 0; y--) {
    const leftToRight = Math.random() < 0.5;
    for (let n = 0; n < cols; n++) {
      const x = leftToRight ? n : cols - 1 - n;
      const i = y * cols + x;
      if (moved[i]) continue;
      switch (cells[i]) {
        case SAND:
          updateSand(x, y, i);
          break;
        case WATER:
          updateWater(x, y, i);
          break;
        case FIRE:
          updateFire(x, y, i);
          break;
        case BURNING:
          updateBurning(x, y, i);
          break;
      }
    }
  }
}

function draw() {
  let count = 0;
  for (let i = 0; i < cells.length; i++) {
    const type = cells[i];
    if (type !== EMPTY) count++;
    pixels[i] = palette[type * 256 + shades[i]];
  }
  bufferCtx.putImageData(image, 0, 0);
  ctx.fillStyle = `rgb(${BACKGROUND})`;
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buffer, 0, 0, cols * CELL, rows * CELL);
  countOutput.value = count.toLocaleString('en-US');
}

// Painting

let pointer = null; // last brush position in cells while the pointer is down

function paint(cx, cy) {
  const radius = Number(brushInput.value);
  // loose materials go down speckled so they look like grains, solids as a full disc
  const density = material === SAND || material === WATER || material === FIRE ? 0.45 : 1;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = Math.round(cx) + dx;
      const y = Math.round(cy) + dy;
      if (dx * dx + dy * dy > radius * radius || x < 0 || x >= cols || y < 0 || y >= rows) continue;
      const i = y * cols + x;
      if (material === EMPTY) {
        cells[i] = EMPTY;
      } else if (cells[i] === EMPTY && Math.random() < density) {
        cells[i] = material;
        shades[i] = material === FIRE ? 20 + Math.random() * 40 : Math.random() * 256;
      }
    }
  }
}

// Stamps the brush along the segment between two pointer samples so fast strokes leave no gaps.
function paintLine(from, to) {
  const spacing = Math.max(1, Number(brushInput.value) / 2);
  const steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / spacing));
  for (let s = 1; s <= steps; s++) {
    paint(from[0] + ((to[0] - from[0]) * s) / steps, from[1] + ((to[1] - from[1]) * s) / steps);
  }
}

function cellPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return [(event.clientX - rect.left) / CELL, (event.clientY - rect.top) / CELL];
}

canvas.addEventListener('pointerdown', (event) => {
  canvas.setPointerCapture(event.pointerId);
  pointer = cellPoint(event);
  paint(...pointer);
});
canvas.addEventListener('pointermove', (event) => {
  if (!pointer) return;
  const next = cellPoint(event);
  paintLine(pointer, next);
  pointer = next;
});
const release = () => {
  pointer = null;
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

// Controls

for (const button of materialButtons) {
  button.addEventListener('click', () => {
    material = Number(button.dataset.material);
    for (const other of materialButtons) other.setAttribute('aria-pressed', String(other === button));
  });
}
pauseButton.addEventListener('click', () => {
  paused = !paused;
  pauseButton.textContent = paused ? 'Play' : 'Pause';
});
document.getElementById('clear').addEventListener('click', () => {
  cells.fill(EMPTY);
});

// A small starting scene: a stone shelf and a wood block to pour onto.
function seed() {
  const shelfY = Math.floor(rows * 0.55);
  for (let x = Math.floor(cols * 0.15); x < Math.floor(cols * 0.45); x++) {
    set(shelfY * cols + x, STONE, Math.random() * 256);
    set((shelfY + 1) * cols + x, STONE, Math.random() * 256);
  }
  for (let y = rows - 14; y < rows; y++) {
    for (let x = Math.floor(cols * 0.62); x < Math.floor(cols * 0.62) + 18; x++) {
      if (x < cols && y >= 0) set(y * cols + x, WOOD, Math.random() * 256);
    }
  }
}

let lastFrame = performance.now();
let pending = 0;
function animate(now) {
  // capped so a slow frame or a return from a background tab never triggers a burst of catch-up steps
  pending = Math.min(pending + (now - lastFrame) / 1000, STEP * 2);
  lastFrame = now;
  if (pointer && !paused) paint(...pointer); // holding still keeps pouring
  for (; pending >= STEP; pending -= STEP) {
    if (!paused) step();
  }
  draw();
  requestAnimationFrame(animate);
}

fillStage(canvas, (w, h) => {
  const first = cols === 0;
  width = w;
  height = h;
  resize(Math.max(1, Math.floor(w / CELL)), Math.max(1, Math.floor(h / CELL)));
  draw();
  // the grid only exists once the stage has a size, so the loop starts here
  if (first) {
    seed();
    requestAnimationFrame(animate);
  }
});
