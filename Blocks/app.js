const COLORS = { I: '#5ed8e6', O: '#f5b942', T: '#c39bff', S: '#5ee6a0', Z: '#ff7a90', J: '#7aa7ff', L: '#f58f42' };
const VISIBLE_ROWS = ROWS - HIDDEN;
// auto-repeat for held left/right keys: wait DAS ms after the first step, then step every ARR ms
const DAS = 170;
const ARR = 50;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const outputs = {
  score: document.getElementById('score'),
  lines: document.getElementById('lines'),
  level: document.getElementById('level'),
  best: document.getElementById('best'),
};

let game = newGame();
let state = 'ready'; // ready | running | paused | over
let layout = null;
let heldDirs = []; // left/right keys held down, the most recent last
let shiftTime = 0;
let shownLines = 0;
let lastFrame = performance.now();

function newGame() {
  return new Game({ flashMs: reducedMotion ? 0 : 300 });
}

function setState(next) {
  state = next;
  const messages = {
    ready: ['Blocks', 'Fill whole rows to clear them. Press Space or tap to start'],
    paused: ['Paused', 'Press P or tap to continue'],
    over: ['Game over', `Score ${game.score}. Press Space or tap to play again`],
  };
  overlay.hidden = state === 'running';
  if (messages[state]) [overlayTitle.textContent, overlayText.textContent] = messages[state];
  heldDirs = [];
  game.softDrop = false;
}

function handleAction() {
  if (state === 'running') {
    setState('paused');
    return;
  }
  if (state === 'over') {
    game = newGame();
    shownLines = 0;
    updateStats();
  }
  setState('running');
}

function updateStats() {
  outputs.score.value = game.score;
  outputs.lines.value = game.lines;
  outputs.level.value = game.level;
  const best = Math.max(game.score, loadBest());
  if (best === game.score) saveBest(best);
  outputs.best.value = best;
}

function loadBest() {
  try {
    return Number(localStorage.getItem('blocks-best')) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem('blocks-best', value);
  } catch {
    // storage unavailable (private mode), the best score just isn't kept
  }
}

function frame(now) {
  const dt = Math.min(now - lastFrame, 100);
  lastFrame = now;
  if (state === 'running') {
    const dir = heldDirs.at(-1);
    if (dir) {
      shiftTime += dt;
      while (shiftTime >= DAS) {
        game.move(dir);
        shiftTime -= ARR;
      }
    }
    game.tick(dt);
    if (game.lines - shownLines === 4) celebrateOver(canvas);
    shownLines = game.lines;
    updateStats();
    if (game.over) setState('over');
  }
  if (layout) draw();
  requestAnimationFrame(frame);
}

// Layout

// Puts hold and next beside the well when there is room (landscape), or in a strip above it (portrait),
// whichever gives bigger cells.
function computeLayout(width, height) {
  const pad = 12;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const sideCell = Math.min(w / 21, h / VISIBLE_ROWS);
  const topCell = Math.min(w / 10, h / (VISIBLE_ROWS + 3.4));

  if (sideCell >= topCell) {
    const c = Math.floor(sideCell);
    const well = { x: Math.round((width - 10 * c) / 2), y: Math.round((height - VISIBLE_ROWS * c) / 2), cell: c };
    const mini = c * 0.75;
    const slot = (x, y) => ({ x, y, w: 5 * c, h: 2.6 * c });
    const label = c * 0.9;
    return {
      well,
      hold: { x: well.x - 5.5 * c, y: well.y, w: 5 * c, h: label + 2.6 * c, label, mini, slots: [slot(well.x - 5.5 * c, well.y + label)] },
      next: {
        x: well.x + 10.5 * c,
        y: well.y,
        w: 5 * c,
        h: label + 7.8 * c,
        label,
        mini,
        slots: [0, 1, 2].map((i) => slot(well.x + 10.5 * c, well.y + label + i * 2.6 * c)),
      },
    };
  }

  const c = Math.floor(topCell);
  const top = Math.round((height - (VISIBLE_ROWS + 3.4) * c) / 2);
  const well = { x: Math.round((width - 10 * c) / 2), y: top + 3.4 * c, cell: c };
  const mini = c * 0.45;
  const label = c * 0.8;
  const slotH = 2.2 * c;
  const nextX = well.x + 3.4 * c;
  const slotW = (6.6 * c) / 3;
  return {
    well,
    hold: { x: well.x, y: top, w: 3 * c, h: label + slotH, label, mini, slots: [{ x: well.x, y: top + label, w: 3 * c, h: slotH }] },
    next: {
      x: nextX,
      y: top,
      w: 6.6 * c,
      h: label + slotH,
      label,
      mini,
      slots: [0, 1, 2].map((i) => ({ x: nextX + i * slotW, y: top + label, w: slotW, h: slotH })),
    },
  };
}

// Drawing

function drawBlock(x, y, size, color) {
  const inset = Math.max(1, size * 0.04);
  const s = size - inset * 2;
  const bevel = s * 0.14;
  x += inset;
  y += inset;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = 'rgb(255 255 255 / 0.32)';
  ctx.fillRect(x, y, s, bevel);
  ctx.fillStyle = 'rgb(255 255 255 / 0.14)';
  ctx.fillRect(x, y + bevel, bevel, s - bevel);
  ctx.fillStyle = 'rgb(0 0 0 / 0.26)';
  ctx.fillRect(x + bevel, y + s - bevel, s - bevel, bevel);
  ctx.fillStyle = 'rgb(0 0 0 / 0.14)';
  ctx.fillRect(x + s - bevel, y + bevel, bevel, s - bevel * 2);
}

function draw() {
  const { well, hold, next } = layout;
  const c = well.cell;
  ctx.fillStyle = 'rgb(22, 27, 38)';
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  ctx.fillStyle = '#121927';
  ctx.fillRect(well.x, well.y, 10 * c, VISIBLE_ROWS * c);
  ctx.strokeStyle = 'rgb(255 255 255 / 0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < 10; x++) {
    ctx.moveTo(well.x + x * c + 0.5, well.y);
    ctx.lineTo(well.x + x * c + 0.5, well.y + VISIBLE_ROWS * c);
  }
  for (let y = 1; y < VISIBLE_ROWS; y++) {
    ctx.moveTo(well.x, well.y + y * c + 0.5);
    ctx.lineTo(well.x + 10 * c, well.y + y * c + 0.5);
  }
  ctx.stroke();

  const cellX = (x) => well.x + x * c;
  const cellY = (y) => well.y + (y - HIDDEN) * c;

  game.board.forEach((row, y) => {
    if (y < HIDDEN) return;
    row.forEach((type, x) => type && drawBlock(cellX(x), cellY(y), c, COLORS[type]));
  });

  if (game.clearing) {
    ctx.fillStyle = `rgb(255 255 255 / ${0.85 * Math.max(0, game.clearing.time / game.flashMs)})`;
    for (const y of game.clearing.rows) ctx.fillRect(well.x, cellY(y), 10 * c, c);
  }

  if (game.piece) {
    const color = COLORS[game.piece.type];
    const ghostDrop = game.ghostY() - game.piece.y;
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (const [x, y] of game.cells()) {
      if (y + ghostDrop < HIDDEN) continue;
      ctx.fillStyle = color;
      ctx.fillRect(cellX(x) + 2, cellY(y + ghostDrop) + 2, c - 4, c - 4);
    }
    ctx.globalAlpha = 1;
    for (const [x, y] of game.cells()) if (y >= HIDDEN) drawBlock(cellX(x), cellY(y), c, color);
  }

  ctx.strokeStyle = '#263248';
  ctx.lineWidth = 2;
  ctx.strokeRect(well.x - 1, well.y - 1, 10 * c + 2, VISIBLE_ROWS * c + 2);

  drawPanel(hold, 'HOLD', [game.held], !game.canHold);
  drawPanel(next, 'NEXT', game.next, false);
}

function drawPanel(panel, title, types, dimmed) {
  ctx.fillStyle = '#121927';
  ctx.beginPath();
  ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 6);
  ctx.fill();
  ctx.fillStyle = '#9aa3b5';
  ctx.font = `600 ${Math.round(panel.label * 0.5)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, panel.x + panel.w / 2, panel.y + panel.label * 0.6);

  ctx.globalAlpha = dimmed ? 0.35 : 1;
  types.forEach((type, i) => type && drawPreview(type, panel.slots[i], panel.mini));
  ctx.globalAlpha = 1;
}

function drawPreview(type, slot, size) {
  const cells = ROTATIONS[type][0];
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = (Math.max(...xs) - minX + 1) * size;
  const h = (Math.max(...ys) - minY + 1) * size;
  const left = slot.x + (slot.w - w) / 2;
  const top = slot.y + (slot.h - h) / 2;
  for (const [x, y] of cells) drawBlock(left + (x - minX) * size, top + (y - minY) * size, size, COLORS[type]);
}

// Keyboard

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(key)) event.preventDefault();

  if (key === 'p' || key === 'Escape') {
    if (state === 'running' || state === 'paused') handleAction();
    return;
  }
  if (key === ' ' && state !== 'running') {
    if (!event.repeat) handleAction();
    return;
  }
  // our own auto-repeat drives held keys, so the system's key repeat is ignored
  if (state !== 'running' || event.repeat) return;

  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const dir = key === 'ArrowLeft' ? -1 : 1;
    heldDirs = [...heldDirs.filter((d) => d !== dir), dir];
    shiftTime = 0;
    game.move(dir);
  } else if (key === 'ArrowDown') {
    game.softDrop = true;
  } else if (key === 'ArrowUp' || key === 'x') {
    game.rotate(1);
  } else if (key === 'z') {
    game.rotate(-1);
  } else if (key === ' ') {
    game.hardDrop();
  } else if (key === 'c' || key === 'Shift') {
    game.hold();
  }
});

document.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    heldDirs = heldDirs.filter((d) => d !== (event.key === 'ArrowLeft' ? -1 : 1));
    shiftTime = 0;
  } else if (event.key === 'ArrowDown') {
    game.softDrop = false;
  }
});

// Touch: tap turns, a horizontal drag moves one column per cell width, dragging down soft drops and
// a quick flick down hard drops.

let touch = null;

canvas.addEventListener('pointerdown', (event) => {
  if (state !== 'running') return;
  canvas.setPointerCapture(event.pointerId);
  touch = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, columns: 0, moved: false };
});

canvas.addEventListener('pointermove', (event) => {
  if (touch?.id !== event.pointerId || state !== 'running') return;
  const c = layout.well.cell;
  const dx = event.clientX - touch.x;
  const dy = event.clientY - touch.y;
  if (Math.hypot(dx, dy) > 10) touch.moved = true;
  const target = Math.trunc(dx / c);
  while (touch.columns < target && game.move(1)) touch.columns++;
  while (touch.columns > target && game.move(-1)) touch.columns--;
  game.softDrop = dy > c && dy > Math.abs(dx);
});

const endTouch = (event) => {
  if (touch?.id !== event.pointerId) return;
  const dx = event.clientX - touch.x;
  const dy = event.clientY - touch.y;
  const duration = event.timeStamp - touch.time;
  game.softDrop = false;
  if (state === 'running' && event.type === 'pointerup') {
    if (!touch.moved && duration < 300) game.rotate(1);
    else if (duration < 300 && dy > 2 * layout.well.cell && dy > 2 * Math.abs(dx)) game.hardDrop();
  }
  touch = null;
};
canvas.addEventListener('pointerup', endTouch);
canvas.addEventListener('pointercancel', endTouch);

overlay.addEventListener('pointerdown', handleAction);

document.getElementById('hold').addEventListener('click', (event) => {
  event.currentTarget.blur(); // so Space goes to the game, not the button
  if (state === 'running') game.hold();
});
document.getElementById('pause').addEventListener('click', (event) => {
  event.currentTarget.blur();
  if (state !== 'over') handleAction();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'running') setState('paused');
});

fillStage(canvas, (width, height) => {
  layout = computeLayout(width, height);
  draw();
});
updateStats();
requestAnimationFrame(frame);
