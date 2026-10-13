const BOARD_SIZE = 600;
const BOT_DELAY = 300; // ms, so the bot's reply doesn't feel instant
const COLORS = {
  [playerX]: [245, 185, 66],
  [playerO]: [94, 230, 160],
};

const cellSize = BOARD_SIZE / board.length;
const tally = { wins: 0, losses: 0, draws: 0 };

let result = null;
let winningLine = null;
let hoverCell = null;
let botTimer = null;

const statusText = document.getElementById('status');
const difficulty = document.getElementById('difficulty');

function setup() {
  const canvas = createCanvas(BOARD_SIZE, BOARD_SIZE);
  canvas.parent(document.querySelector('.stage'));
  fitCanvas(canvas.elt, BOARD_SIZE, BOARD_SIZE);

  canvas.elt.addEventListener('pointerdown', (event) => playHuman(cellAt(event)));
  canvas.elt.addEventListener('pointermove', (event) => {
    hoverCell = event.pointerType === 'mouse' ? cellAt(event) : null;
  });
  canvas.elt.addEventListener('pointerleave', () => (hoverCell = null));
  document.getElementById('new-game').addEventListener('click', newGame);
}

function draw() {
  background(22, 27, 38);
  drawWinningCells();
  drawGrid();
  drawCells();
  drawHover();
  drawWinningLine();
}

// maps a pointer position to a board cell, the canvas may be scaled by CSS
function cellAt(event) {
  const rect = event.target.getBoundingClientRect();
  const x = floor(((event.clientX - rect.left) / rect.width) * board.length);
  const y = floor(((event.clientY - rect.top) / rect.height) * board.length);
  return { x: constrain(x, 0, board.length - 1), y: constrain(y, 0, board.length - 1) };
}

function playHuman(cell) {
  if (result !== null || currentPlayer !== human || board[cell.y][cell.x] !== emptyCell) {
    return;
  }
  place(cell);
  if (endTurn()) return;

  currentPlayer = bot;
  statusText.textContent = 'Bot is thinking...';
  botTimer = setTimeout(playBot, BOT_DELAY);
}

function playBot() {
  botTimer = null;
  const moves = { easy: randomMove, medium: goodMove, hard: bestMove };
  moves[difficulty.value]();
  if (endTurn()) return;

  currentPlayer = human;
  statusText.textContent = 'Your turn';
}

// returns true when the game is over
function endTurn() {
  result = checkWinner();
  if (result === null) return false;

  winningLine = getWinningLine();
  if (result === 'tie') {
    tally.draws++;
    statusText.textContent = 'Draw';
  } else {
    tally[result === human ? 'wins' : 'losses']++;
    statusText.textContent = `${result} wins!`;
  }
  for (const [name, value] of Object.entries(tally)) {
    document.getElementById(name).value = value;
  }
  return true;
}

function newGame() {
  clearTimeout(botTimer);
  botTimer = null;
  clearBoard();
  result = null;
  winningLine = null;
  statusText.textContent = 'Your turn';
}

function cellCenter(cell) {
  return { x: (cell.x + 0.5) * cellSize, y: (cell.y + 0.5) * cellSize };
}

function drawGrid() {
  const inset = cellSize * 0.12;
  stroke(255, 255, 255, 30);
  strokeWeight(8);
  strokeCap(ROUND);
  for (let i = 1; i < board.length; i++) {
    line(cellSize * i, inset, cellSize * i, BOARD_SIZE - inset);
    line(inset, cellSize * i, BOARD_SIZE - inset, cellSize * i);
  }
}

function drawCells() {
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board.length; x++) {
      if (board[y][x] !== emptyCell) drawMark(board[y][x], { x, y }, 255);
    }
  }
}

function drawMark(sign, cell, alpha) {
  const { x, y } = cellCenter(cell);
  const r = cellSize * 0.26;
  stroke(...COLORS[sign], alpha);
  strokeWeight(cellSize * 0.09);
  strokeCap(ROUND);
  noFill();
  if (sign === playerX) {
    line(x - r, y - r, x + r, y + r);
    line(x - r, y + r, x + r, y - r);
  } else {
    circle(x, y, r * 2.1);
  }
}

function drawHover() {
  if (hoverCell && result === null && currentPlayer === human && board[hoverCell.y][hoverCell.x] === emptyCell) {
    drawMark(human, hoverCell, 50);
  }
}

function drawWinningCells() {
  if (!winningLine) return;
  noStroke();
  fill(...COLORS[result], 28);
  const pad = cellSize * 0.08;
  for (const cell of winningLine) {
    rect(cell.x * cellSize + pad, cell.y * cellSize + pad, cellSize - 2 * pad, cellSize - 2 * pad, 18);
  }
}

function drawWinningLine() {
  if (!winningLine) return;
  const start = cellCenter(winningLine[0]);
  const end = cellCenter(winningLine[winningLine.length - 1]);
  stroke(232, 235, 242, 220);
  strokeWeight(cellSize * 0.05);
  strokeCap(ROUND);
  line(start.x, start.y, end.x, end.y);
}
