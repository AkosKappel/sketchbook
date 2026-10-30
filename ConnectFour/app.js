// Board drawing and input. The rules and the bot live in game.js.

const BOT_DELAY = 300; // ms, so the bot's reply doesn't feel instant
const LANDING_DELAY = 450; // ms, roughly when a dropped disc has settled

const stage = document.querySelector('.stage');
const boardElement = document.getElementById('board');
const statusOutput = document.getElementById('status');
const difficultySelect = document.getElementById('difficulty');
const firstSelect = document.getElementById('first');
const tally = { wins: 0, losses: 0, draws: 0 };

let game;
let turn = 'human'; // human | bot | over
let botTimer = null;
let humanStartsNext = true;
let focusedCol = 3;

// One button per column. Each holds a ghost disc slot above the board and the six holes, top hole first.
const columns = [];
const slots = []; // slots[col][row], row 0 at the bottom
for (let col = 0; col < COLS; col++) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'column';
  button.dataset.col = col;
  const ghost = document.createElement('span');
  ghost.className = 'ghost';
  button.append(ghost);
  slots[col] = [];
  for (let row = ROWS - 1; row >= 0; row--) {
    const slot = document.createElement('span');
    slot.className = 'slot';
    slots[col][row] = slot;
    button.append(slot);
  }
  columns.push(button);
  boardElement.append(button);
}

function newGame() {
  clearTimeout(botTimer);
  game = createGame();
  for (const slot of slots.flat()) {
    slot.replaceChildren();
    slot.classList.remove('win');
  }
  boardElement.classList.remove('has-winner');
  updateColumnLabels();

  const first = firstSelect.value === 'alternate' ? (humanStartsNext ? 'human' : 'bot') : firstSelect.value;
  humanStartsNext = first !== 'human';
  if (first === 'human') {
    setTurn('human', 'Your turn');
  } else {
    setTurn('bot', 'Bot starts...');
    botTimer = setTimeout(playBot, BOT_DELAY);
  }
}

function setTurn(next, message) {
  turn = next;
  statusOutput.textContent = message;
  boardElement.classList.toggle('locked', turn !== 'human');
}

function playHuman(col) {
  if (turn !== 'human' || !canDrop(game, col)) return;
  if (place(col, HUMAN)) return;
  setTurn('bot', 'Bot is thinking...');
  // the search runs inside the timeout, so the player's disc is painted before the bot starts thinking
  botTimer = setTimeout(playBot, BOT_DELAY);
}

function playBot() {
  const col = chooseMove(game, BOT, difficultySelect.value);
  if (place(col, BOT)) return;
  setTurn('human', `Bot played column ${col + 1}. Your turn`);
}

// drops a disc and returns true when that ended the game
function place(col, player) {
  const row = drop(game, col, player);
  const disc = document.createElement('span');
  disc.className = `disc ${player === HUMAN ? 'human' : 'bot'}`;
  // how many holes the disc falls through, counting the ghost slot it starts from
  disc.style.setProperty('--fall', ROWS - row);
  slots[col][row].append(disc);
  updateColumnLabels();

  const line = winningLine(game, col, row);
  if (line) {
    for (const cell of line) slots[cell.col][cell.row].classList.add('win');
    boardElement.classList.add('has-winner');
    if (player === HUMAN) {
      endGame('wins', 'You win');
      setTimeout(() => celebrateOver(boardElement), LANDING_DELAY);
    } else {
      endGame('losses', `Bot wins in column ${col + 1}`);
    }
    return true;
  }
  if (isFull(game)) {
    endGame('draws', 'Draw, the board is full');
    return true;
  }
  return false;
}

function endGame(result, message) {
  tally[result]++;
  document.getElementById(result).value = tally[result];
  setTurn('over', `${message}. Press New game to play again`);
}

function updateColumnLabels() {
  columns.forEach((button, col) => {
    const full = !canDrop(game, col);
    button.ariaLabel = `Column ${col + 1}${full ? ', full' : ''}`;
    button.ariaDisabled = String(full);
    button.tabIndex = col === focusedCol ? 0 : -1;
  });
}

function focusColumn(col) {
  focusedCol = Math.max(0, Math.min(COLS - 1, col));
  updateColumnLabels();
  columns[focusedCol].focus();
}

function fitBoard() {
  // 32px of stage padding; the board is 7 cells plus 8 gaps wide and 7 cells (with the ghost row) plus 7 gaps tall
  const size = Math.min((stage.clientWidth - 32) / 8.12, (stage.clientHeight - 32) / 7.98, 80);
  boardElement.style.setProperty('--cell', `${Math.floor(size)}px`);
}

// Input: click or tap a column; Left and Right move between columns, Enter or Space drops (native button
// behaviour), and the keys 1 to 7 drop straight into a column from anywhere on the page.
boardElement.addEventListener('click', (event) => {
  const button = event.target.closest('.column');
  if (!button) return;
  focusedCol = Number(button.dataset.col);
  updateColumnLabels();
  playHuman(focusedCol);
});
boardElement.addEventListener('keydown', (event) => {
  const moves = { ArrowLeft: -1, ArrowRight: 1, Home: -COLS, End: COLS };
  if (!(event.key in moves)) return;
  event.preventDefault();
  focusColumn(focusedCol + moves[event.key]);
});
document.addEventListener('keydown', (event) => {
  const col = Number(event.key) - 1;
  if (event.target.closest('select') || event.ctrlKey || event.metaKey || event.altKey) return;
  if (Number.isInteger(col) && col >= 0 && col < COLS) {
    focusedCol = col;
    updateColumnLabels();
    playHuman(col);
  }
});

document.getElementById('new-game').addEventListener('click', newGame);
new ResizeObserver(fitBoard).observe(stage);
fitBoard();
newGame();
