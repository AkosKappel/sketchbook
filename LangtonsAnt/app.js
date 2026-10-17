const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const ruleSelect = document.getElementById('rule');
const speedInput = document.getElementById('speed');
const pauseButton = document.getElementById('pause');
const stepsOutput = document.getElementById('steps');
const antsOutput = document.getElementById('ants');

const CELL = 4; // CSS pixels per cell
// Cell colors by state: state 0 is the empty background, the rest cycle through the palette.
const PALETTE = [
  [12, 17, 28],
  [122, 167, 255],
  [94, 230, 160],
  [245, 185, 66],
  [255, 122, 144],
  [195, 155, 255],
  [94, 216, 230],
];
const DIRECTIONS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]; // up, right, down, left: turning right is +1, turning left is -1

let cols = 0;
let rows = 0;
let grid = new Uint8Array(0); // state of every cell
let ants = []; // { x, y, direction }
let turns = []; // per state: +1 right, -1 left
let steps = 0;
let paused = false;

// The grid is drawn one pixel per cell into this small canvas, then scaled up without smoothing.
const pixels = document.createElement('canvas');
const pixelsContext = pixels.getContext('2d');
let image = null;

function reset() {
  turns = [...ruleSelect.value].map((letter) => (letter === 'R' ? 1 : -1));
  grid = new Uint8Array(cols * rows);
  repaint();
  ants = [];
  addAnt(Math.floor(cols / 2), Math.floor(rows / 2));
  steps = 0;
}

function addAnt(x, y) {
  ants.push({ x, y, direction: 0 });
  antsOutput.value = ants.length;
}

function repaint() {
  image = pixelsContext.createImageData(cols, rows);
  for (let i = 0; i < grid.length; i++) paint(i);
}

// Keeps the pattern and the ants centered on a grid of the new size, cropping or padding at the edges.
function resizeGrid(newCols, newRows) {
  const offsetX = Math.floor((newCols - cols) / 2);
  const offsetY = Math.floor((newRows - rows) / 2);
  const resized = new Uint8Array(newCols * newRows);
  for (let y = Math.max(0, -offsetY); y < Math.min(rows, newRows - offsetY); y++) {
    for (let x = Math.max(0, -offsetX); x < Math.min(cols, newCols - offsetX); x++) {
      resized[(y + offsetY) * newCols + x + offsetX] = grid[y * cols + x];
    }
  }
  for (const ant of ants) {
    ant.x = (((ant.x + offsetX) % newCols) + newCols) % newCols;
    ant.y = (((ant.y + offsetY) % newRows) + newRows) % newRows;
  }
  [grid, cols, rows] = [resized, newCols, newRows];
  repaint();
}

function paint(index) {
  const color = PALETTE[grid[index] === 0 ? 0 : ((grid[index] - 1) % (PALETTE.length - 1)) + 1];
  image.data.set(color, index * 4);
  image.data[index * 4 + 3] = 255;
}

// Each ant turns by the rule for the color it stands on, moves the cell to the next color and steps forward.
function step() {
  for (const ant of ants) {
    const index = ant.y * cols + ant.x;
    const state = grid[index];
    ant.direction = (ant.direction + turns[state] + 4) % 4;
    grid[index] = (state + 1) % turns.length;
    paint(index);
    const [dx, dy] = DIRECTIONS[ant.direction];
    ant.x = (ant.x + dx + cols) % cols; // the edges wrap around
    ant.y = (ant.y + dy + rows) % rows;
  }
  steps++;
}

function draw() {
  pixelsContext.putImageData(image, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pixels, 0, 0, cols * CELL, rows * CELL);
  ctx.fillStyle = '#ff5c6c';
  for (const ant of ants) ctx.fillRect(ant.x * CELL - 1, ant.y * CELL - 1, CELL + 2, CELL + 2);
}

function animate() {
  // the stage is sized (and the grid created) by the first resize callback
  if (!image) return requestAnimationFrame(animate);
  if (!paused) {
    // the speed slider doubles the steps per frame with each notch, 1 to 4096
    const count = 2 ** Number(speedInput.value);
    for (let i = 0; i < count; i++) step();
    stepsOutput.value = steps.toLocaleString('en');
  }
  draw();
  requestAnimationFrame(animate);
}

canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / CELL);
  const y = Math.floor((event.clientY - rect.top) / CELL);
  if (x >= 0 && x < cols && y >= 0 && y < rows) addAnt(x, y);
});

ruleSelect.addEventListener('change', reset);
document.getElementById('reset').addEventListener('click', reset);
pauseButton.addEventListener('click', () => {
  paused = !paused;
  pauseButton.textContent = paused ? 'Play' : 'Pause';
});

fillStage(canvas, (width, height) => {
  const newCols = Math.ceil(width / CELL);
  const newRows = Math.ceil(height / CELL);
  pixels.width = newCols;
  pixels.height = newRows;
  if (image) {
    resizeGrid(newCols, newRows);
  } else {
    [cols, rows] = [newCols, newRows];
    reset();
  }
});
requestAnimationFrame(animate);
