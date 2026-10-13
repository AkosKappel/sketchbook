const LEVELS = {
  easy: { cols: 9, rows: 9, mines: 10 },
  medium: { cols: 16, rows: 16, mines: 40 },
  hard: { cols: 30, rows: 16, mines: 99 },
};
const LONG_PRESS_MS = 400;

const stage = document.querySelector('.stage');
const boardElement = document.getElementById('board');
const minesOutput = document.getElementById('mines-left');
const timeOutput = document.getElementById('time');
const bestOutput = document.getElementById('best');
const statusOutput = document.getElementById('status');
const difficultySelect = document.getElementById('difficulty');
const flagModeButton = document.getElementById('flag-mode');

let level;
let cols;
let rows;
let cells = []; // { mine, open, flag, count, button }
let state = 'ready'; // ready | playing | won | lost
let openCount = 0;
let startTime = 0;
let timer = null;
let flagMode = false;

function newGame() {
  level = LEVELS[difficultySelect.value];
  // the wide hard board is turned upright on portrait screens
  const portrait = stage.clientHeight > stage.clientWidth;
  [cols, rows] = portrait && level.cols > level.rows ? [level.rows, level.cols] : [level.cols, level.rows];

  clearInterval(timer);
  state = 'ready';
  openCount = 0;
  timeOutput.value = 0;
  statusOutput.textContent = 'Click any cell to start';
  bestOutput.value = loadBest() ?? '–';

  boardElement.replaceChildren();
  boardElement.style.setProperty('--cols', cols);
  cells = Array.from({ length: cols * rows }, (_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cell';
    button.dataset.index = index;
    boardElement.append(button);
    return { mine: false, open: false, flag: false, count: 0, button };
  });
  cells.forEach((_, index) => render(index));
  updateMinesLeft();
  fitBoard();
}

function neighbours(index) {
  const x = index % cols;
  const y = Math.floor(index / cols);
  const result = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if ((dx || dy) && nx >= 0 && nx < cols && ny >= 0 && ny < rows) result.push(ny * cols + nx);
    }
  }
  return result;
}

// Mines are placed after the first click and never on or next to it, so the first click always opens an area.
function placeMines(safeIndex) {
  const safe = new Set([safeIndex, ...neighbours(safeIndex)]);
  const candidates = cells.map((_, index) => index).filter((index) => !safe.has(index));
  for (let placed = 0; placed < level.mines; placed++) {
    const pick = Math.floor(Math.random() * (candidates.length - placed)) + placed;
    [candidates[placed], candidates[pick]] = [candidates[pick], candidates[placed]];
    cells[candidates[placed]].mine = true;
  }
  cells.forEach((cell, index) => {
    cell.count = neighbours(index).filter((n) => cells[n].mine).length;
  });
}

function reveal(index) {
  if (state === 'ready') {
    placeMines(index);
    state = 'playing';
    startTime = performance.now();
    timer = setInterval(() => (timeOutput.value = elapsedSeconds()), 250);
    statusOutput.textContent = 'Good luck';
  }
  const cell = cells[index];
  if (cell.open || cell.flag) return;
  if (cell.mine) {
    lose(index);
    return;
  }

  // Opening a cell with no mines around it opens all its neighbours too, spreading across empty areas.
  const stack = [index];
  while (stack.length) {
    const current = stack.pop();
    const next = cells[current];
    if (next.open || next.flag) continue;
    next.open = true;
    openCount++;
    render(current);
    if (next.count === 0) stack.push(...neighbours(current));
  }

  if (openCount === cells.length - level.mines) win();
}

// Clicking an open number whose flags are all placed opens the rest of its neighbours.
function chord(index) {
  const around = neighbours(index);
  if (around.filter((n) => cells[n].flag).length !== cells[index].count) return;
  for (const n of around) {
    if (state === 'playing' && !cells[n].open && !cells[n].flag) reveal(n);
  }
}

function toggleFlag(index) {
  const cell = cells[index];
  if (cell.open || state === 'won' || state === 'lost') return;
  cell.flag = !cell.flag;
  render(index);
  updateMinesLeft();
}

function activate(index, flag) {
  if (state === 'won' || state === 'lost') return;
  if (flag) {
    toggleFlag(index);
  } else if (cells[index].open) {
    chord(index);
  } else {
    reveal(index);
  }
}

function win() {
  state = 'won';
  clearInterval(timer);
  const seconds = elapsedSeconds();
  timeOutput.value = seconds;
  const best = loadBest();
  if (best === null || seconds < best) {
    saveBest(seconds);
    bestOutput.value = seconds;
    statusOutput.textContent = `Cleared in ${seconds} s, a new best!`;
  } else {
    statusOutput.textContent = `Cleared in ${seconds} s`;
  }
  cells.forEach((cell, index) => {
    if (cell.mine && !cell.flag) {
      cell.flag = true;
      render(index);
    }
  });
  updateMinesLeft();
}

function lose(hitIndex) {
  state = 'lost';
  clearInterval(timer);
  statusOutput.textContent = 'Boom. Press New game to try again';
  // show every unflagged mine and mark the flags that were wrong
  cells.forEach((cell, index) => {
    if (cell.mine !== cell.flag) {
      cell.open = cell.mine;
      render(index);
    }
  });
  cells[hitIndex].button.classList.add('hit');
}

function render(index) {
  const { mine, open, flag, count, button } = cells[index];
  const over = state === 'lost';
  button.className = 'cell';
  if (open && mine) {
    button.classList.add('open', 'mine');
    button.textContent = '✹';
    button.ariaLabel = 'Mine';
  } else if (flag) {
    const wrong = over && !mine;
    button.classList.add(wrong ? 'wrong' : 'flag');
    button.textContent = wrong ? '✕' : '⚑';
    button.ariaLabel = wrong ? 'Wrong flag' : 'Flag';
  } else if (open) {
    button.classList.add('open');
    if (count) button.classList.add(`n${count}`);
    button.textContent = count || '';
    button.ariaLabel = count ? null : 'Empty';
  } else {
    button.textContent = '';
    button.ariaLabel = 'Hidden';
  }
}

function updateMinesLeft() {
  minesOutput.value = level.mines - cells.filter((cell) => cell.flag).length;
}

function elapsedSeconds() {
  return Math.floor((performance.now() - startTime) / 1000);
}

function fitBoard() {
  // 32px of stage padding, 2px gaps and border around the cells
  const size = Math.min((stage.clientWidth - 36) / cols - 2, (stage.clientHeight - 36) / rows - 2, 44);
  boardElement.style.setProperty('--cell', `${Math.max(14, Math.floor(size))}px`);
}

function loadBest() {
  try {
    const value = localStorage.getItem(`minesweeper-best-${difficultySelect.value}`);
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
}

function saveBest(seconds) {
  try {
    localStorage.setItem(`minesweeper-best-${difficultySelect.value}`, seconds);
  } catch {
    // storage unavailable (private mode), the best time just isn't kept
  }
}

// Input: click to reveal, right-click or long-press to flag, F to flag the focused cell, or flag mode for touch.
let pressTimer = null;
let longPressed = false;

boardElement.addEventListener('click', (event) => {
  const button = event.target.closest('.cell');
  if (!button || longPressed) return;
  activate(Number(button.dataset.index), flagMode);
});
boardElement.addEventListener('contextmenu', (event) => {
  const button = event.target.closest('.cell');
  if (!button) return;
  event.preventDefault();
  // a touch long-press can also fire contextmenu; whichever comes first flags, the other is ignored
  clearTimeout(pressTimer);
  if (!longPressed) activate(Number(button.dataset.index), true);
  longPressed = true;
});
boardElement.addEventListener('pointerdown', (event) => {
  const button = event.target.closest('.cell');
  longPressed = false;
  if (!button || event.pointerType === 'mouse') return;
  pressTimer = setTimeout(() => {
    longPressed = true;
    activate(Number(button.dataset.index), !flagMode);
    navigator.vibrate?.(20);
  }, LONG_PRESS_MS);
});
for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
  boardElement.addEventListener(type, () => clearTimeout(pressTimer));
}
boardElement.addEventListener('keydown', (event) => {
  const button = event.target.closest('.cell');
  if (!button || event.key.toLowerCase() !== 'f') return;
  activate(Number(button.dataset.index), true);
});

flagModeButton.addEventListener('click', () => {
  flagMode = !flagMode;
  flagModeButton.ariaPressed = String(flagMode);
});
difficultySelect.addEventListener('change', newGame);
document.getElementById('new-game').addEventListener('click', newGame);

let lastPortrait = stage.clientHeight > stage.clientWidth;
new ResizeObserver(() => {
  // turning the phone before the first click flips the hard board to match; a running game keeps its layout
  const portrait = stage.clientHeight > stage.clientWidth;
  if (portrait !== lastPortrait && state === 'ready') {
    lastPortrait = portrait;
    newGame();
  } else {
    fitBoard();
  }
}).observe(stage);

newGame();
