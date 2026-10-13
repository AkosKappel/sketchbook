const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const generatorSelect = document.getElementById('generator');
const solverSelect = document.getElementById('solver');
const cellSizeInput = document.getElementById('cell-size');
const speedInput = document.getElementById('speed');
const exploredOutput = document.getElementById('explored');
const pathOutput = document.getElementById('path');

// Each cell stores its walls as bits. Every direction knows its offset and the opposite wall.
const N = 1;
const E = 2;
const S = 4;
const W = 8;
const DIRECTIONS = [
  { wall: N, dx: 0, dy: -1, opposite: S },
  { wall: E, dx: 1, dy: 0, opposite: W },
  { wall: S, dx: 0, dy: 1, opposite: N },
  { wall: W, dx: -1, dy: 0, opposite: E },
];

let width = 0;
let height = 0;
let cellSize = 24;
let cols = 0;
let rows = 0;
let walls = new Uint8Array(0); // wall bits per cell
let carved = new Uint8Array(0); // cells the generator has reached
let current = -1; // the generator's current cell
let explored = new Uint32Array(0); // order in which the solver expanded each cell, 0 = not yet
let frontier = new Set();
let path = [];
let start = 0;
let goal = 0;
let task = null; // the running generator or solver, advanced a few steps every frame

const mazeDone = () => !carved.includes(0);
const random = (n) => Math.floor(Math.random() * n);

function neighbours(cell) {
  const x = cell % cols;
  const y = Math.floor(cell / cols);
  return DIRECTIONS.filter(({ dx, dy }) => x + dx >= 0 && x + dx < cols && y + dy >= 0 && y + dy < rows).map(
    (direction) => ({ ...direction, cell: cell + direction.dy * cols + direction.dx }),
  );
}

function carve(from, direction) {
  walls[from] &= ~direction.wall;
  walls[direction.cell] &= ~direction.opposite;
}

// Depth-first: walk to a random unvisited neighbour, back up when stuck. Makes long, winding corridors.
function* backtracker() {
  const stack = [random(cols * rows)];
  carved[stack[0]] = 1;
  while (stack.length) {
    current = stack.at(-1);
    const options = neighbours(current).filter((n) => !carved[n.cell]);
    if (options.length) {
      const next = options[random(options.length)];
      carve(current, next);
      carved[next.cell] = 1;
      stack.push(next.cell);
    } else {
      stack.pop();
    }
    yield;
  }
}

// Prim's: grow the maze from a random frontier cell each step. Makes many short dead ends.
function* prim() {
  const first = random(cols * rows);
  carved[first] = 1;
  const edge = new Set(neighbours(first).map((n) => n.cell));
  while (edge.size) {
    const cells = [...edge];
    current = cells[random(cells.length)];
    edge.delete(current);
    const inside = neighbours(current).filter((n) => carved[n.cell]);
    carve(current, inside[random(inside.length)]);
    carved[current] = 1;
    for (const n of neighbours(current)) if (!carved[n.cell]) edge.add(n.cell);
    yield;
  }
}

// One search loop for all three solvers; they differ only in which frontier cell they expand next.
const distance = (cell) => Math.abs((cell % cols) - (goal % cols)) + Math.abs(Math.floor(cell / cols) - Math.floor(goal / cols));
const PICK = {
  bfs: (list) => list[0], // oldest first: spreads out evenly
  dfs: (list) => list.at(-1), // newest first: dives down one corridor
  astar: (list, steps) => list.reduce((best, cell) => (steps[cell] + distance(cell) < steps[best] + distance(best) ? cell : best)), // most promising first
};

function* solve(pick) {
  explored = new Uint32Array(cols * rows);
  path = [];
  const steps = new Uint32Array(cols * rows);
  const cameFrom = new Int32Array(cols * rows).fill(-1);
  let order = 0;
  frontier = new Set([start]);
  cameFrom[start] = start;

  while (frontier.size) {
    const cell = pick([...frontier], steps);
    frontier.delete(cell);
    explored[cell] = ++order;
    exploredOutput.value = order;
    if (cell === goal) break;
    for (const n of neighbours(cell)) {
      if (walls[cell] & n.wall || cameFrom[n.cell] !== -1) continue;
      cameFrom[n.cell] = cell;
      steps[n.cell] = steps[cell] + 1;
      frontier.add(n.cell);
    }
    yield;
  }

  frontier.clear();
  for (let cell = goal; cell !== start; cell = cameFrom[cell]) path.push(cell);
  path.push(start);
  pathOutput.value = path.length;
}

function startSolving() {
  pathOutput.value = '–';
  task = solve(PICK[solverSelect.value]);
}

function newMaze() {
  cols = Math.max(4, Math.floor((width - 16) / cellSize));
  rows = Math.max(4, Math.floor((height - 16) / cellSize));
  walls = new Uint8Array(cols * rows).fill(N | E | S | W);
  carved = new Uint8Array(cols * rows);
  explored = new Uint32Array(cols * rows);
  frontier.clear();
  path = [];
  start = 0;
  goal = cols * rows - 1;
  exploredOutput.value = 0;
  pathOutput.value = '–';

  const generator = generatorSelect.value === 'prim' ? prim() : backtracker();
  // the solver starts on its own once the maze is done
  task = (function* () {
    yield* generator;
    current = -1;
    startSolving();
  })();
}

function draw() {
  ctx.fillStyle = '#0c111c';
  ctx.fillRect(0, 0, width, height);
  const left = Math.floor((width - cols * cellSize) / 2);
  const top = Math.floor((height - rows * cellSize) / 2);
  const total = explored.reduce((max, value) => Math.max(max, value), 1);
  const fill = (cell, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(left + (cell % cols) * cellSize, top + Math.floor(cell / cols) * cellSize, cellSize, cellSize);
  };

  for (let cell = 0; cell < cols * rows; cell++) {
    if (explored[cell]) {
      // early cells blue, late ones pink, so the order of the search is visible
      fill(cell, `hsl(${220 + (explored[cell] / total) * 110} 70% 55% / 0.35)`);
    } else if (carved[cell]) {
      fill(cell, '#161d2b');
    }
  }
  for (const cell of frontier) fill(cell, 'rgb(245 185 66 / 0.45)');
  if (current >= 0) fill(current, '#f5b942');

  ctx.strokeStyle = 'rgb(232 235 242 / 0.75)';
  ctx.lineWidth = Math.max(1.5, cellSize / 12);
  ctx.lineCap = 'square';
  ctx.beginPath();
  for (let cell = 0; cell < cols * rows; cell++) {
    const x = left + (cell % cols) * cellSize;
    const y = top + Math.floor(cell / cols) * cellSize;
    // north and west walls of every cell, plus the outer east and south edges, cover each wall once
    if (walls[cell] & N) ctx.rect(x, y, cellSize, 0);
    if (walls[cell] & W) ctx.rect(x, y, 0, cellSize);
    if (cell % cols === cols - 1 && walls[cell] & E) ctx.rect(x + cellSize, y, 0, cellSize);
    if (cell >= cols * (rows - 1) && walls[cell] & S) ctx.rect(x, y + cellSize, cellSize, 0);
  }
  ctx.stroke();

  const center = (cell) => [left + ((cell % cols) + 0.5) * cellSize, top + (Math.floor(cell / cols) + 0.5) * cellSize];
  if (path.length) {
    ctx.strokeStyle = '#5ee6a0';
    ctx.lineWidth = Math.max(2, cellSize * 0.28);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const cell of path) ctx.lineTo(...center(cell));
    ctx.stroke();
  }
  for (const [cell, color] of [
    [start, '#5ee6a0'],
    [goal, '#ff7a90'],
  ]) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(...center(cell), cellSize * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function animate() {
  const steps = 2 ** Number(speedInput.value);
  for (let i = 0; task && i < steps; i++) {
    const running = task;
    // a finished generation has already swapped in the solver, so only clear the task if it is unchanged
    if (running.next().done && task === running) task = null;
  }
  draw();
  requestAnimationFrame(animate);
}

canvas.addEventListener('pointerdown', (event) => {
  const left = Math.floor((width - cols * cellSize) / 2);
  const top = Math.floor((height - rows * cellSize) / 2);
  const x = Math.floor((event.offsetX - left) / cellSize);
  const y = Math.floor((event.offsetY - top) / cellSize);
  // only once the maze is finished, so the generator isn't interrupted
  if (x < 0 || x >= cols || y < 0 || y >= rows || !mazeDone()) return;
  goal = y * cols + x;
  startSolving();
});

document.getElementById('new-maze').addEventListener('click', newMaze);
document.getElementById('solve').addEventListener('click', () => {
  if (mazeDone()) startSolving();
});
solverSelect.addEventListener('change', () => {
  if (mazeDone()) startSolving();
});
generatorSelect.addEventListener('change', newMaze);
cellSizeInput.addEventListener('change', () => {
  cellSize = Number(cellSizeInput.value);
  newMaze();
});

if (matchMedia('(prefers-reduced-motion: reduce)').matches) speedInput.value = speedInput.max;
if (matchMedia('(max-width: 640px)').matches) cellSize = 20;
cellSizeInput.value = cellSize;

fillStage(canvas, (stageWidth, stageHeight) => {
  const resized = Math.floor((stageWidth - 16) / cellSize) !== cols || Math.floor((stageHeight - 16) / cellSize) !== rows;
  width = stageWidth;
  height = stageHeight;
  if (resized) newMaze();
});
requestAnimationFrame(animate);
