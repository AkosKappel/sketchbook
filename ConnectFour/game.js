// Connect Four rules and the minimax bot. Board drawing and input live in app.js.

const COLS = 7;
const ROWS = 6;
const EMPTY = 0;
const HUMAN = 1;
const BOT = 2;
const WIN_SCORE = 1_000_000;
const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];

// columns are searched from the middle out, the strongest moves first, so alpha-beta prunes more
const MOVE_ORDER = [3, 2, 4, 1, 5, 0, 6];

const LEVELS = {
  easy: { depth: 2, randomChance: 0.3 },
  medium: { depth: 4, randomChance: 0 },
  hard: { depth: 7, randomChance: 0 },
};

// cells are stored column by column with row 0 at the bottom, so a disc lands at index col * ROWS + heights[col]
function cellIndex(col, row) {
  return col * ROWS + row;
}

// every horizontal, vertical and diagonal run of four cells, as cell indices four at a time; a flat typed
// array because evaluate() reads it at every leaf of the search and nested arrays were several times slower
const windowList = [];
for (let col = 0; col < COLS; col++) {
  for (let row = 0; row < ROWS; row++) {
    for (const [dc, dr] of DIRECTIONS) {
      const endCol = col + 3 * dc;
      const endRow = row + 3 * dr;
      if (endCol < COLS && endRow >= 0 && endRow < ROWS) {
        for (let i = 0; i < 4; i++) windowList.push(cellIndex(col + i * dc, row + i * dr));
      }
    }
  }
}
const WINDOWS = Int8Array.from(windowList);

function createGame() {
  return { cells: new Int8Array(COLS * ROWS), heights: new Int8Array(COLS), moves: 0 };
}

function canDrop(game, col) {
  return game.heights[col] < ROWS;
}

function legalMoves(game) {
  return MOVE_ORDER.filter((col) => canDrop(game, col));
}

// returns the row the disc landed in
function drop(game, col, player) {
  const row = game.heights[col]++;
  game.cells[cellIndex(col, row)] = player;
  game.moves++;
  return row;
}

function undo(game, col) {
  game.cells[cellIndex(col, --game.heights[col])] = EMPTY;
  game.moves--;
}

function isFull(game) {
  return game.moves === COLS * ROWS;
}

// how many of the player's discs follow (col, row) in one direction, not counting the cell itself
function countFrom(game, col, row, dc, dr, player) {
  let count = 0;
  for (let c = col + dc, r = row + dr; c >= 0 && c < COLS && r >= 0 && r < ROWS; c += dc, r += dr) {
    if (game.cells[cellIndex(c, r)] !== player) break;
    count++;
  }
  return count;
}

// the run of four or more through the disc at (col, row), as [{ col, row }], or null
function winningLine(game, col, row) {
  const player = game.cells[cellIndex(col, row)];
  if (player === EMPTY) return null;
  for (const [dc, dr] of DIRECTIONS) {
    const back = countFrom(game, col, row, -dc, -dr, player);
    const length = back + 1 + countFrom(game, col, row, dc, dr, player);
    if (length >= 4) {
      return Array.from({ length }, (_, i) => ({ col: col + (i - back) * dc, row: row + (i - back) * dr }));
    }
  }
  return null;
}

// does the disc on top of this column complete four in a row; runs inside the search, so it allocates nothing
function isWinningDrop(game, col) {
  const row = game.heights[col] - 1;
  const player = game.cells[cellIndex(col, row)];
  for (let d = 0; d < DIRECTIONS.length; d++) {
    const [dc, dr] = DIRECTIONS[d];
    if (countFrom(game, col, row, dc, dr, player) + countFrom(game, col, row, -dc, -dr, player) >= 3) return true;
  }
  return false;
}

// Rates a position for the player: open windows holding three or two of their discs count for them,
// the same windows of the opponent count against, and discs in the middle column touch the most windows.
function evaluate(game, player) {
  const cells = game.cells;
  let score = 0;
  for (let w = 0; w < WINDOWS.length; w += 4) {
    let mine = 0;
    let theirs = 0;
    for (let i = w; i < w + 4; i++) {
      const cell = cells[WINDOWS[i]];
      if (cell === player) mine++;
      else if (cell !== EMPTY) theirs++;
    }
    if (theirs === 0) score += mine === 3 ? 5 : mine === 2 ? 2 : 0;
    else if (mine === 0) score -= theirs === 3 ? 5 : theirs === 2 ? 2 : 0;
  }
  for (let row = 0; row < ROWS; row++) {
    const cell = cells[cellIndex(3, row)];
    if (cell === player) score += 3;
    else if (cell !== EMPTY) score -= 3;
  }
  return score;
}

// Minimax in negamax form: the score is always from the view of the player to move, so one branch
// serves both sides. Quicker wins score higher because the remaining depth is added to the win score.
function negamax(game, depth, alpha, beta, player) {
  if (depth === 0) return evaluate(game, player);
  const opponent = 3 - player;
  let best = -Infinity;
  for (let i = 0; i < MOVE_ORDER.length; i++) {
    const col = MOVE_ORDER[i];
    if (!canDrop(game, col)) continue;
    drop(game, col, player);
    let score;
    if (isWinningDrop(game, col)) score = WIN_SCORE + depth;
    else if (isFull(game)) score = 0;
    else score = -negamax(game, depth - 1, -beta, -alpha, opponent);
    undo(game, col);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

// The column the player should drop into at this difficulty. Ties between equally good columns are
// broken at random so games don't repeat; Easy sometimes plays a random column instead of thinking.
function chooseMove(game, player, level, random = Math.random) {
  const { depth, randomChance } = LEVELS[level];
  const moves = legalMoves(game);
  if (random() < randomChance) return moves[Math.floor(random() * moves.length)];

  let bestScore = -Infinity;
  let best = [];
  for (const col of moves) {
    drop(game, col, player);
    let score;
    if (isWinningDrop(game, col)) score = WIN_SCORE + depth;
    else if (isFull(game)) score = 0;
    // a window one wider than the best score so far, so equal moves are scored exactly and can tie
    else score = -negamax(game, depth - 1, -Infinity, -bestScore + 1, 3 - player);
    undo(game, col);
    if (score > bestScore) {
      bestScore = score;
      best = [col];
    } else if (score === bestScore) {
      best.push(col);
    }
  }
  return best[Math.floor(random() * best.length)];
}

if (typeof module !== 'undefined') {
  module.exports = { COLS, ROWS, EMPTY, HUMAN, BOT, LEVELS, createGame, canDrop, drop, isFull, winningLine, chooseMove };
}
