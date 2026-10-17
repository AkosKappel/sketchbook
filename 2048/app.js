const SIZE = 4;
const GOAL = 2048;
const SLIDE_MS = 100;
// Tile colors by power of two, from cool blues for small tiles to warm colors for big ones.
const COLORS = ['#2b3850', '#3b4f73', '#4f6fa8', '#5e8be0', '#5ec4e6', '#5ee6a0', '#a6e65e', '#e6d75e', '#f5b942', '#f58f42', '#ff7a90', '#e65ec4', '#c39bff'];

const stage = document.querySelector('.stage');
const boardElement = document.getElementById('board');
const scoreOutput = document.getElementById('score');
const bestOutput = document.getElementById('best');
const statusOutput = document.getElementById('status');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayButton = document.getElementById('overlay-button');

let grid = []; // SIZE * SIZE cells, each null or a tile { value, x, y, element }
let score = 0;
let state = 'playing'; // playing | won (overlay shown) | over
let reachedGoal = false;

const at = (x, y) => grid[y * SIZE + x];
const inside = (x, y) => x >= 0 && x < SIZE && y >= 0 && y < SIZE;

function newGame() {
  boardElement.querySelectorAll('.tile').forEach((element) => element.remove());
  grid = Array(SIZE * SIZE).fill(null);
  score = 0;
  state = 'playing';
  reachedGoal = false;
  overlay.hidden = true;
  addRandomTile();
  addRandomTile();
  updateScore();
  statusOutput.textContent = 'Merge equal tiles to reach 2048';
}

function addRandomTile() {
  const empty = grid.flatMap((tile, index) => (tile ? [] : [index]));
  const index = empty[Math.floor(Math.random() * empty.length)];
  const tile = { value: Math.random() < 0.9 ? 2 : 4, x: index % SIZE, y: Math.floor(index / SIZE) };
  tile.element = document.createElement('div');
  tile.element.className = 'tile new';
  boardElement.append(tile.element);
  grid[index] = tile;
  render(tile);
}

function render(tile) {
  const { element, value, x, y } = tile;
  const power = Math.log2(value);
  element.textContent = value;
  element.style.setProperty('--x', x);
  element.style.setProperty('--y', y);
  element.style.setProperty('--tile', COLORS[Math.min(power, COLORS.length - 1)]);
  element.style.setProperty('--tile-text', power < 3 ? 'var(--text)' : '#0c111c');
  element.style.setProperty('--font-scale', [0, 0.42, 0.42, 0.36, 0.3][String(value).length] ?? 0.24);
}

// Slides every tile as far as it goes in direction (dx, dy). Tiles nearest to that edge move first, and a
// tile that already merged this move can't merge again, so [2, 2, 4] becomes [4, 4], not [8].
function move(dx, dy) {
  const xs = [...Array(SIZE).keys()];
  const ys = [...xs];
  if (dx === 1) xs.reverse();
  if (dy === 1) ys.reverse();

  const merged = new Set();
  let moved = false;
  for (const y of ys) {
    for (const x of xs) {
      const tile = at(x, y);
      if (!tile) continue;
      let nx = x;
      let ny = y;
      while (inside(nx + dx, ny + dy) && !at(nx + dx, ny + dy)) {
        nx += dx;
        ny += dy;
      }
      const next = inside(nx + dx, ny + dy) ? at(nx + dx, ny + dy) : null;
      grid[y * SIZE + x] = null;

      if (next && next.value === tile.value && !merged.has(next)) {
        merged.add(next);
        next.value *= 2;
        score += next.value;
        // the merged tile slides under its partner and disappears once the slide ends
        tile.element.classList.add('leaving');
        Object.assign(tile, { x: next.x, y: next.y });
        render(tile);
        setTimeout(() => {
          tile.element.remove();
          render(next);
          next.element.classList.remove('new', 'merged');
          void next.element.offsetWidth; // restart the pop animation
          next.element.classList.add('merged');
        }, SLIDE_MS);
        moved = true;
      } else {
        Object.assign(tile, { x: nx, y: ny });
        grid[ny * SIZE + nx] = tile;
        render(tile);
        moved ||= nx !== x || ny !== y;
      }
    }
  }
  if (!moved) return;

  addRandomTile();
  updateScore();
  if (!reachedGoal && grid.some((tile) => tile?.value >= GOAL)) {
    reachedGoal = true;
    state = 'won';
    showOverlay('You made 2048!', `Score ${score}. Keep going for a bigger tile?`, 'Keep going');
  } else if (!canMove()) {
    state = 'over';
    statusOutput.textContent = 'No moves left';
    showOverlay('Game over', `Score ${score}`, 'Play again');
  }
}

function canMove() {
  return grid.some((tile, index) => {
    if (!tile) return true;
    const x = index % SIZE;
    const y = Math.floor(index / SIZE);
    return (x + 1 < SIZE && at(x + 1, y)?.value === tile.value) || (y + 1 < SIZE && at(x, y + 1)?.value === tile.value);
  });
}

function updateScore() {
  scoreOutput.value = score;
  const best = Math.max(score, loadBest());
  if (best === score) saveBest(score);
  bestOutput.value = best;
}

function showOverlay(title, text, button) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayButton.textContent = button;
  overlay.hidden = false;
  overlayButton.focus();
}

function loadBest() {
  try {
    return Number(localStorage.getItem('2048-best')) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem('2048-best', value);
  } catch {
    // storage unavailable (private mode), the best score just isn't kept
  }
}

function fitBoard() {
  // 32px of stage padding; the board is 4 cells plus 5 gaps of 0.12 cells
  const size = Math.min(stage.clientWidth - 32, stage.clientHeight - 32, 480);
  boardElement.style.setProperty('--cell', `${Math.floor(size / 4.6)}px`);
}

const KEYS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  a: [-1, 0],
  d: [1, 0],
  w: [0, -1],
  s: [0, 1],
};

document.addEventListener('keydown', (event) => {
  const direction = KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key];
  if (!direction || event.ctrlKey || event.metaKey || event.altKey) return;
  event.preventDefault();
  if (state === 'playing') move(...direction);
});

let swipeStart = null;
stage.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'mouse') swipeStart = [event.clientX, event.clientY];
});
stage.addEventListener('pointerup', (event) => {
  if (!swipeStart || state !== 'playing') return;
  const dx = event.clientX - swipeStart[0];
  const dy = event.clientY - swipeStart[1];
  swipeStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
  if (Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx), 0);
  else move(0, Math.sign(dy));
});

overlayButton.addEventListener('click', () => {
  if (state === 'won') {
    state = 'playing';
    overlay.hidden = true;
    statusOutput.textContent = 'Keep going';
  } else {
    newGame();
  }
});
document.getElementById('new-game').addEventListener('click', newGame);

boardElement.append(...Array.from({ length: SIZE * SIZE }, () => Object.assign(document.createElement('div'), { className: 'slot' })));
new ResizeObserver(fitBoard).observe(stage);
fitBoard();
newGame();
