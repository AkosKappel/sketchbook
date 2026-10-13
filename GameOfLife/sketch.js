const cellSize = 18;
let cols;
let rows;
let cells; // one byte per cell, 1 = alive, row by row
let generation = 0;
let playing = true;
let lastStep = 0;
let paintValue = null; // what a drag paints: 1 to draw, 0 to erase, null when not drawing

const stage = document.querySelector('.stage');
const playButton = document.getElementById('play');
const speedInput = document.getElementById('speed');
const generationOutput = document.getElementById('generation');
const aliveOutput = document.getElementById('alive');

function setup() {
  [cols, rows] = gridSize();
  const canvas = createCanvas(cols * cellSize, rows * cellSize).parent(stage);

  randomize();
  setupDrawing(canvas.elt);
  new ResizeObserver(regrid).observe(stage);

  playButton.addEventListener('click', togglePlay);
  document.getElementById('step').addEventListener('click', () => {
    setPlaying(false);
    step();
  });
  document.getElementById('random').addEventListener('click', randomize);
  document.getElementById('clear').addEventListener('click', () => {
    setPlaying(false);
    cells.fill(0);
    generation = 0;
    updateStats();
  });
  document.addEventListener('keydown', (event) => {
    // a focused button already reacts to Space, toggling here as well would undo it
    if (event.key !== ' ' || event.target.closest('button, input')) return;
    event.preventDefault();
    togglePlay();
  });
}

function gridSize() {
  return [max(8, floor((stage.clientWidth - 32) / cellSize)), max(8, floor((stage.clientHeight - 32) / cellSize))];
}

// After a resize or rotation the grid gets the new size and keeps the pattern centered on it.
function regrid() {
  const [newCols, newRows] = gridSize();
  if (newCols === cols && newRows === rows) return;

  const next = new Uint8Array(newCols * newRows);
  const offsetX = floor((newCols - cols) / 2);
  const offsetY = floor((newRows - rows) / 2);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const nx = x + offsetX;
      const ny = y + offsetY;
      if (nx >= 0 && nx < newCols && ny >= 0 && ny < newRows) next[ny * newCols + nx] = cells[y * cols + x];
    }
  }
  [cols, rows, cells] = [newCols, newRows, next];
  resizeCanvas(cols * cellSize, rows * cellSize);
  updateStats();
}

function draw() {
  const interval = 1000 / Number(speedInput.value);
  if (playing && paintValue === null && millis() - lastStep >= interval) {
    lastStep = millis();
    step();
  }

  background(16, 20, 28);
  stroke(255, 255, 255, 12);
  strokeWeight(1);
  for (let x = 1; x < cols; x++) line(x * cellSize, 0, x * cellSize, height);
  for (let y = 1; y < rows; y++) line(0, y * cellSize, width, y * cellSize);

  noStroke();
  fill(94, 230, 160);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (cells[y * cols + x]) rect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2, 3);
    }
  }
}

function step() {
  const next = new Uint8Array(cells.length);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const neighbours = countNeighbours(x, y);
      const alive = cells[y * cols + x];
      next[y * cols + x] = neighbours === 3 || (alive && neighbours === 2) ? 1 : 0;
    }
  }
  cells = next;
  generation++;
  updateStats();
}

// the edges wrap around, so the grid behaves like the surface of a torus
function countNeighbours(x, y) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const row = (y + dy + rows) % rows;
      const col = (x + dx + cols) % cols;
      count += cells[row * cols + col];
    }
  }
  return count;
}

function randomize() {
  cells = Uint8Array.from({ length: cols * rows }, () => (random() < 0.25 ? 1 : 0));
  generation = 0;
  updateStats();
}

function updateStats() {
  generationOutput.value = generation;
  aliveOutput.value = cells.reduce((sum, cell) => sum + cell, 0);
}

function togglePlay() {
  setPlaying(!playing);
}

function setPlaying(value) {
  playing = value;
  playButton.textContent = playing ? 'Pause' : 'Play';
}

function setupDrawing(canvas) {
  const cellAt = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = floor(((event.clientX - rect.left) / rect.width) * cols);
    const y = floor(((event.clientY - rect.top) / rect.height) * rows);
    return x >= 0 && x < cols && y >= 0 && y < rows ? y * cols + x : -1;
  };

  canvas.addEventListener('pointerdown', (event) => {
    const index = cellAt(event);
    if (index < 0) return;
    canvas.setPointerCapture(event.pointerId);
    // starting on a live cell erases, starting on an empty one draws
    paintValue = cells[index] ? 0 : 1;
    cells[index] = paintValue;
    updateStats();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (paintValue === null) return;
    const index = cellAt(event);
    if (index < 0 || cells[index] === paintValue) return;
    cells[index] = paintValue;
    updateStats();
  });
  const stopDrawing = () => (paintValue = null);
  canvas.addEventListener('pointerup', stopDrawing);
  canvas.addEventListener('pointercancel', stopDrawing);
}
