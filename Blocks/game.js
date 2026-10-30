// Rules of the falling-block game. No drawing or input here, so the rules can be tested on their own in Node.
const COLS = 10;
const ROWS = 22; // 20 visible rows plus 2 hidden ones on top where pieces spawn
const HIDDEN = 2;
const LOCK_DELAY = 500;
const MAX_LOCK_RESETS = 15;
const CLEAR_FLASH = 300;
const SOFT_DROP_INTERVAL = 30;
const LINE_POINTS = [0, 100, 300, 500, 800];

const SHAPES = {
  I: ['....', 'IIII', '....', '....'],
  J: ['J..', 'JJJ', '...'],
  L: ['..L', 'LLL', '...'],
  O: ['OO', 'OO'],
  S: ['.SS', 'SS.', '...'],
  T: ['.T.', 'TTT', '...'],
  Z: ['ZZ.', '.ZZ', '...'],
};
const TYPES = Object.keys(SHAPES);

// Cells of every piece in its 4 rotation states, as [x, y] inside the piece's box. Turning the box
// clockwise around its center gives exactly the SRS states.
const ROTATIONS = Object.fromEntries(
  Object.entries(SHAPES).map(([type, rows]) => {
    const size = rows.length;
    let cells = rows.flatMap((row, y) => [...row].flatMap((cell, x) => (cell === '.' ? [] : [[x, y]])));
    const states = [];
    for (let i = 0; i < 4; i++) {
      states.push(cells);
      cells = cells.map(([x, y]) => [size - 1 - y, x]);
    }
    return [type, states];
  }),
);

// SRS wall kicks for turning clockwise out of state 0, 1, 2 and 3, written with y pointing up as in the
// guideline. Turning counter-clockwise from state s uses the negated kicks of the clockwise turn into s.
const KICKS = {
  JLSTZ: [
    [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  ],
  I: [
    [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  ],
};

class Game {
  constructor({ random = Math.random, flashMs = CLEAR_FLASH } = {}) {
    this.random = random;
    this.flashMs = flashMs;
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.bag = [];
    this.queue = [];
    this.held = null;
    this.canHold = true;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.over = false;
    this.softDrop = false;
    this.clearing = null; // { rows, time } while full rows flash before they collapse
    this.spawn(this.takeNext());
  }

  // 7-bag randomizer: every run of 7 pieces holds each piece once, in shuffled order
  takeNext() {
    while (this.queue.length < 4) {
      if (!this.bag.length) {
        this.bag = [...TYPES];
        for (let i = this.bag.length - 1; i > 0; i--) {
          const j = Math.floor(this.random() * (i + 1));
          [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
      }
      this.queue.push(this.bag.pop());
    }
    return this.queue.shift();
  }

  get next() {
    return this.queue.slice(0, 3);
  }

  get gravity() {
    // guideline curve: seconds per row at each level
    return 1000 * (0.8 - (this.level - 1) * 0.007) ** (this.level - 1);
  }

  get active() {
    return !this.over && this.piece !== null;
  }

  spawn(type) {
    this.piece = { type, rotation: 0, x: type === 'O' ? 4 : 3, y: type === 'I' ? 0 : 1 };
    this.fallTime = 0;
    this.lockTime = 0;
    this.lockResets = 0;
    this.lowestY = this.piece.y;
    if (this.collides(this.piece)) this.over = true;
  }

  cells(piece = this.piece) {
    return ROTATIONS[piece.type][piece.rotation].map(([x, y]) => [piece.x + x, piece.y + y]);
  }

  collides(piece) {
    return this.cells(piece).some(([x, y]) => x < 0 || x >= COLS || y >= ROWS || (y >= 0 && this.board[y][x]));
  }

  grounded() {
    return this.collides({ ...this.piece, y: this.piece.y + 1 });
  }

  ghostY() {
    let y = this.piece.y;
    while (!this.collides({ ...this.piece, y: y + 1 })) y++;
    return y;
  }

  tryMove(dx, dy, rotation = this.piece.rotation) {
    const moved = { ...this.piece, x: this.piece.x + dx, y: this.piece.y + dy, rotation };
    if (this.collides(moved)) return false;
    this.piece = moved;
    if (moved.y > this.lowestY) {
      this.lowestY = moved.y;
      this.lockResets = 0;
      this.lockTime = 0;
    }
    return true;
  }

  // Moving or turning a piece that rests on the stack restarts its lock delay, but only so many times,
  // so a piece can't be kept alive forever.
  resetLock() {
    if (this.lockTime > 0 && this.lockResets < MAX_LOCK_RESETS) {
      this.lockTime = 0;
      this.lockResets++;
    }
  }

  move(dx) {
    if (!this.active || !this.tryMove(dx, 0)) return false;
    this.resetLock();
    return true;
  }

  rotate(dir) {
    if (!this.active || this.piece.type === 'O') return false;
    const from = this.piece.rotation;
    const to = (from + dir + 4) % 4;
    const table = this.piece.type === 'I' ? KICKS.I : KICKS.JLSTZ;
    const tests = dir === 1 ? table[from] : table[to].map(([x, y]) => [-x, -y]);
    for (const [kx, ky] of tests) {
      if (this.tryMove(kx, -ky, to)) {
        this.resetLock();
        return true;
      }
    }
    return false;
  }

  hardDrop() {
    if (!this.active) return;
    let rows = 0;
    while (this.tryMove(0, 1)) rows++;
    this.score += rows * 2;
    this.lock();
  }

  hold() {
    if (!this.active || !this.canHold) return;
    const type = this.piece.type;
    this.spawn(this.held ?? this.takeNext());
    this.held = type;
    this.canHold = false;
  }

  tick(dt) {
    if (this.over) return;
    if (this.clearing) {
      this.clearing.time -= dt;
      if (this.clearing.time <= 0) this.collapse();
      return;
    }
    const interval = this.softDrop ? Math.min(SOFT_DROP_INTERVAL, this.gravity) : this.gravity;
    this.fallTime += dt;
    while (this.fallTime >= interval && this.tryMove(0, 1)) {
      this.fallTime -= interval;
      if (this.softDrop) this.score++;
    }
    if (this.grounded()) {
      this.fallTime = 0;
      this.lockTime += dt;
      if (this.lockTime >= LOCK_DELAY) this.lock();
    } else {
      this.lockTime = 0;
    }
  }

  lock() {
    const cells = this.cells();
    for (const [x, y] of cells) if (y >= 0) this.board[y][x] = this.piece.type;
    this.piece = null;
    this.canHold = true;
    // a piece that locks entirely above the visible well ends the game
    if (cells.every(([, y]) => y < HIDDEN)) {
      this.over = true;
      return;
    }
    const rows = [];
    this.board.forEach((row, y) => row.every(Boolean) && rows.push(y));
    if (!rows.length) {
      this.spawn(this.takeNext());
      return;
    }
    this.clearing = { rows, time: this.flashMs };
    if (this.flashMs <= 0) this.collapse();
  }

  collapse() {
    const { rows } = this.clearing;
    this.clearing = null;
    for (const y of [...rows].reverse()) this.board.splice(y, 1);
    for (const _ of rows) this.board.unshift(Array(COLS).fill(null));
    this.score += LINE_POINTS[rows.length] * this.level;
    this.lines += rows.length;
    this.level = 1 + Math.floor(this.lines / 10);
    this.spawn(this.takeNext());
  }
}

if (typeof module !== 'undefined') module.exports = { Game, COLS, ROWS, HIDDEN, TYPES };
