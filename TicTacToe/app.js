// Canvas settings:
const cnvWidth = 400;
const cnvHeight = 400;

// Playing board initialization:
const board = createBoard(3);

// Size of one small cell:
const cellWidth = cnvWidth / board.length;
const cellHeight = cnvHeight / board.length;

// Player types:
const playerX = 'X';
const playerO = 'O';
const emptyCell = '';

// Players:
const human = playerX;
const bot = playerO;

let currentPlayer = human; // starting player
let result = null;

let scores = {
  X: -10,
  O: 10,
  tie: 0,
};

function createBoard(size) {
  const board = [];
  let row;
  for (let i = 0; i < size; i++) {
    row = [];
    for (let j = 0; j < size; j++) {
      row.push('');
    }
    board.push(row);
  }
  return board;
}

function drawGrid() {
  background(255);
  stroke(0, 0, 0);

  // vertical
  for (let i = 1; i < board.length; i++) {
    line(cellWidth * i, 0, cellWidth * i, cnvHeight);
  }

  // horizontal
  for (let i = 1; i < board.length; i++) {
    line(0, cellHeight * i, cnvWidth, cellHeight * i);
  }
}

function drawCells() {
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board.length; j++) {
      let x = cellWidth * j + cellWidth / 2;
      let y = cellHeight * i + cellHeight / 2;

      let cell = board[i][j];
      let r = cellWidth / 4;

      if (cell == playerX) {
        drawX(x, y, r);
      } else if (cell == playerO) {
        drawO(x, y, r);
      }
    }
  }
}

function drawX(x, y, r) {
  stroke(0, 0, 255);
  line(x - r, y - r, x + r, y + r);
  line(x - r, y + r, x + r, y - r);
}

function drawO(x, y, r) {
  stroke(255, 0, 0);
  noFill();
  ellipse(x, y, r * 2);
}

function inRange(num, min, max) {
  return num >= min && num <= max;
}

function randomMove() {
  let freeCells = getFreeCells();
  if (freeCells.length > 0) {
    let move = random(freeCells);
    board[move.y][move.x] = currentPlayer;
  }
}

function getFreeCells() {
  let free = [];
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board.length; j++) {
      if (board[i][j] === emptyCell) {
        free.push({ y: i, x: j });
      }
    }
  }
  return free;
}

function goodMove() {
  let winningMove = hasFinishingMove(currentPlayer);
  let blockingMove = hasFinishingMove(getOppenent());

  if (winningMove !== null) {
    board[winningMove.y][winningMove.x] = currentPlayer;
  } else if (blockingMove !== null) {
    board[blockingMove.y][blockingMove.x] = currentPlayer;
  } else {
    randomMove();
  }
}

function hasFinishingMove(sign) {
  // check rows
  let count;
  for (let i = 0; i < board.length; i++) {
    count = 0;

    for (let j = 0; j < board.length; j++) {
      if (board[i][j] === sign) {
        count++;
      }
    }

    if (count === board.length - 1) {
      for (let j = 0; j < board.length; j++) {
        if (board[i][j] === emptyCell) {
          return { x: j, y: i };
        }
      }
    }
  }

  // check columns
  for (let i = 0; i < board.length; i++) {
    count = 0;

    for (let j = 0; j < board.length; j++) {
      if (board[j][i] === sign) {
        count++;
      }
    }

    if (count === board.length - 1) {
      for (let j = 0; j < board.length; j++) {
        if (board[j][i] === emptyCell) {
          return { x: i, y: j };
        }
      }
    }
  }

  // check diagonals
  count = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i][i] === sign) {
      count++;
    }
  }
  if (count === board.length - 1) {
    for (let i = 0; i < board.length; i++) {
      if (board[i][i] === emptyCell) {
        return { x: i, y: i };
      }
    }
  }

  count = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i][board.length - 1 - i] === sign) {
      count++;
    }
  }
  if (count === board.length - 1) {
    for (let i = 0; i < board.length; i++) {
      if (board[i][board.length - 1 - i] === emptyCell) {
        return { x: board.length - 1 - i, y: i };
      }
    }
  }

  return null;
}

function bestMove() {
  let move = null;
  let bestScore = -Infinity;
  let freeCells = getFreeCells();

  for (const cell of freeCells) {
    board[cell.y][cell.x] = currentPlayer;
    let score = minimax(10, false);
    board[cell.y][cell.x] = emptyCell;
    if (score > bestScore) {
      bestScore = score;
      move = cell;
    }
  }

  if (move !== null) {
    board[move.y][move.x] = currentPlayer;
  }
}

function minimax(maxDepth, isMaximizing, alpha = -Infinity, beta = Infinity) {
  let result = checkWinner();
  if (result !== null) {
    return scores[result];
  }

  if (maxDepth <= 0) {
    return scores.tie;
  }

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (let i = 0; i < board.length; i++) {
      for (let j = 0; j < board.length; j++) {
        if (board[i][j] === emptyCell) {
          board[i][j] = currentPlayer;
          let score = minimax(maxDepth - 1, false, alpha, beta);
          board[i][j] = emptyCell;

          maxScore = max(score, maxScore);
          alpha = max(alpha, score);

          if (beta <= alpha) {
            return maxScore;
          }
        }
      }
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (let i = 0; i < board.length; i++) {
      for (let j = 0; j < board.length; j++) {
        if (board[i][j] === emptyCell) {
          board[i][j] = getOppenent();
          let score = minimax(maxDepth - 1, true, alpha, beta);
          board[i][j] = emptyCell;

          minScore = min(score, minScore);
          beta = min(beta, score);

          if (beta <= alpha) {
            return minScore;
          }
        }
      }
    }
    return minScore;
  }
}

function getOppenent() {
  if (currentPlayer === playerX) {
    return playerO;
  } else if (currentPlayer === playerO) {
    return playerX;
  }
}

function checkWinner() {
  let winner = null;

  // horizontal
  for (let i = 0; i < board.length; i++) {
    if (board[i].every((element, index, array) => element === array[0] && array[0] !== emptyCell)) {
      winner = board[i][0];
    }
  }

  // vertical
  for (let i = 0; i < board.length; i++) {
    if (board.every((row, index, arr) => row[i] === arr[0][i] && arr[0][i] !== emptyCell)) {
      winner = board[0][i];
    }
  }

  // diagonal
  if (board.every((_, i, arr) => board[i][i] === arr[0][0] && arr[0][0] !== emptyCell)) {
    winner = board[0][0];
  }

  // anti-diagonal
  const len = board.length - 1;
  if (board.every((_, i, arr) => board[i][len - i] === arr[0][len] && arr[0][len] !== emptyCell)) {
    winner = board[0][len];
  }

  let nFreeCells = 0;
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board.length; j++) {
      if (board[i][j] === emptyCell) {
        nFreeCells++;
      }
    }
  }

  if (winner === null && nFreeCells === 0) {
    return 'tie';
  }
  return winner;
}

function displayWinner() {
  if (result == 'tie') {
    gameResult.innerHTML = 'Tie!';
  } else if (result === null) {
    gameResult.innerHTML = '';
  } else {
    gameResult.innerHTML = `${result} wins!`;
  }
}

function resetGame() {
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board.length; j++) {
      board[i][j] = emptyCell;
    }
  }

  result = null;
  currentPlayer = human;

  displayWinner();
  loop();
}
