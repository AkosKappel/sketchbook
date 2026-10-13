// Board, rules and bot strategies. Drawing and input live in sketch.js.

const playerX = 'X';
const playerO = 'O';
const emptyCell = '';

const human = playerX;
const bot = playerO;

const board = createBoard(3);
const lines = createLines(board.length);

let currentPlayer = human; // starting player

const scores = {
  X: -10,
  O: 10,
  tie: 0,
};

function createBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(emptyCell));
}

// every row, column and diagonal as a list of cells
function createLines(size) {
  const range = [...Array(size).keys()];
  const result = [];
  for (const i of range) {
    result.push(range.map((j) => ({ y: i, x: j })));
    result.push(range.map((j) => ({ y: j, x: i })));
  }
  result.push(range.map((i) => ({ y: i, x: i })));
  result.push(range.map((i) => ({ y: i, x: size - 1 - i })));
  return result;
}

function clearBoard() {
  for (const row of board) row.fill(emptyCell);
  currentPlayer = human;
}

function getFreeCells() {
  const free = [];
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board.length; j++) {
      if (board[i][j] === emptyCell) {
        free.push({ y: i, x: j });
      }
    }
  }
  return free;
}

function place(cell) {
  if (cell) board[cell.y][cell.x] = currentPlayer;
}

function randomMove() {
  place(random(getFreeCells()));
}

function goodMove() {
  place(hasFinishingMove(currentPlayer) ?? hasFinishingMove(getOpponent()) ?? random(getFreeCells()));
}

// a free cell that completes a line for the given sign, or null
function hasFinishingMove(sign) {
  for (const line of lines) {
    const values = line.map((cell) => board[cell.y][cell.x]);
    const count = values.filter((value) => value === sign).length;
    const free = values.indexOf(emptyCell);
    if (count === board.length - 1 && free !== -1) {
      return line[free];
    }
  }
  return null;
}

function bestMove() {
  let move = null;
  let bestScore = -Infinity;

  for (const cell of getFreeCells()) {
    board[cell.y][cell.x] = currentPlayer;
    const score = minimax(10, false);
    board[cell.y][cell.x] = emptyCell;
    if (score > bestScore) {
      bestScore = score;
      move = cell;
    }
  }

  place(move);
}

function minimax(maxDepth, isMaximizing, alpha = -Infinity, beta = Infinity) {
  const result = checkWinner();
  if (result !== null) {
    return scores[result];
  }

  if (maxDepth <= 0) {
    return scores.tie;
  }

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const cell of getFreeCells()) {
      board[cell.y][cell.x] = currentPlayer;
      const score = minimax(maxDepth - 1, false, alpha, beta);
      board[cell.y][cell.x] = emptyCell;

      maxScore = max(score, maxScore);
      alpha = max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  }

  let minScore = Infinity;
  for (const cell of getFreeCells()) {
    board[cell.y][cell.x] = getOpponent();
    const score = minimax(maxDepth - 1, true, alpha, beta);
    board[cell.y][cell.x] = emptyCell;

    minScore = min(score, minScore);
    beta = min(beta, score);
    if (beta <= alpha) break;
  }
  return minScore;
}

function getOpponent() {
  return currentPlayer === playerX ? playerO : playerX;
}

// the completed line, or null
function getWinningLine() {
  return (
    lines.find((line) => {
      const first = board[line[0].y][line[0].x];
      return first !== emptyCell && line.every((cell) => board[cell.y][cell.x] === first);
    }) ?? null
  );
}

// 'X', 'O', 'tie' or null while the game goes on
function checkWinner() {
  const line = getWinningLine();
  if (line) return board[line[0].y][line[0].x];
  return getFreeCells().length === 0 ? 'tie' : null;
}
