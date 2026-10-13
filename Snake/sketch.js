let cellSize;
let snake;
let apple;
let state = 'ready'; // ready | running | paused | over
let best = loadBest();

const stage = document.querySelector('.stage');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const scoreOutput = document.getElementById('score');
const bestOutput = document.getElementById('best');

const cols = () => floor(width / cellSize);
const rows = () => floor(height / cellSize);

function setup() {
  createCanvas(1, 1).parent(stage);
  frameRate(10);

  newGame();
  bestOutput.value = best;
  setupSwipe(stage);
  new ResizeObserver(fitBoard).observe(stage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'running') setState('paused');
  });
}

// The board is a whole number of cells, at most 30 x 26, with bigger cells on bigger screens.
function boardSize() {
  const availableWidth = stage.clientWidth - 32;
  const availableHeight = stage.clientHeight - 32;
  const cell = min(availableWidth, availableHeight) < 500 ? 22 : 30;
  return {
    cell,
    cols: max(8, min(30, floor(availableWidth / cell))),
    rows: max(8, min(26, floor(availableHeight / cell))),
  };
}

function fitBoard() {
  const size = boardSize();
  if (size.cell === cellSize && size.cols === cols() && size.rows === rows()) return;

  if (state === 'running' || state === 'paused') {
    // A game in progress keeps its grid, scaled down to fit; the new grid starts with the next game.
    setState('paused');
    const scale = min(1, (stage.clientWidth - 32) / width, (stage.clientHeight - 32) / height);
    const canvas = document.querySelector('canvas');
    canvas.style.width = `${width * scale}px`;
    canvas.style.height = `${height * scale}px`;
  } else {
    newGame();
  }
}

function newGame() {
  const size = boardSize();
  cellSize = size.cell;
  resizeCanvas(size.cols * cellSize, size.rows * cellSize);
  snake = new Snake();
  apple = new Apple();
  scoreOutput.value = 0;
}

function draw() {
  if (state === 'running') {
    snake.update();
    scoreOutput.value = snake.score;
    if (snake.dead) {
      gameOver();
    }
  }

  drawBoard();
  apple.show();
  snake.show();
}

function drawBoard() {
  background(22, 27, 38);
  stroke(255, 255, 255, 14);
  strokeWeight(1);
  for (let x = 1; x < cols(); x++) line(x * cellSize, 0, x * cellSize, height);
  for (let y = 1; y < rows(); y++) line(0, y * cellSize, width, y * cellSize);
}

function gameOver() {
  if (snake.score > best) {
    best = snake.score;
    saveBest(best);
    bestOutput.value = best;
  }
  setState('over');
}

function setState(next) {
  state = next;
  const messages = {
    ready: ['Snake', 'Press an arrow key or swipe to start'],
    paused: ['Paused', 'Press Space or tap to continue'],
    over: ['Game over', `Score ${snake.score}. Press Space or tap to play again`],
  };
  overlay.hidden = state === 'running';
  if (messages[state]) {
    [overlayTitle.textContent, overlayText.textContent] = messages[state];
  }
}

function handleDirection(direction) {
  if (state === 'over') return;
  snake.turn(direction);
  if (state !== 'running') setState('running');
}

function handleAction() {
  if (state === 'running') {
    setState('paused');
  } else if (state === 'over') {
    newGame();
    setState('running');
  } else {
    setState('running');
  }
}

function keyPressed() {
  const directions = {
    ArrowUp: DIRECTION.up,
    ArrowDown: DIRECTION.down,
    ArrowLeft: DIRECTION.left,
    ArrowRight: DIRECTION.right,
    w: DIRECTION.up,
    s: DIRECTION.down,
    a: DIRECTION.left,
    d: DIRECTION.right,
  };

  if (directions[key]) {
    handleDirection(directions[key]);
    return false; // keep the arrow keys from scrolling the page
  }
  if (key === ' ') {
    handleAction();
    return false;
  }
}

function setupSwipe(element) {
  let start = null;
  element.addEventListener('pointerdown', (event) => {
    start = { x: event.clientX, y: event.clientY };
  });
  element.addEventListener('pointerup', (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;

    if (max(abs(dx), abs(dy)) < 24) {
      handleAction(); // a tap
    } else if (abs(dx) > abs(dy)) {
      handleDirection(dx > 0 ? DIRECTION.right : DIRECTION.left);
    } else {
      handleDirection(dy > 0 ? DIRECTION.down : DIRECTION.up);
    }
  });
}

function loadBest() {
  try {
    return Number(localStorage.getItem('snake-best')) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem('snake-best', value);
  } catch {
    // storage unavailable (private mode), the best score just isn't kept
  }
}
