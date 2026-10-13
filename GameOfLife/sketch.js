const cellSize = 30;
let cells;
let drawingState;
let isRunning;

const STATE = {
  alive: 1,
  dead: 0,
};

function make2DArray() {
  return Array(floor(height / cellSize))
    .fill()
    .map(() => Array(floor(width / cellSize)).fill(STATE.dead));
}

function setup() {
  // initialize window
  createCanvas(1500, 900).parent('canvas-container');
  document.getElementById('start-btn').addEventListener('click', () => (isRunning = true));
  document.getElementById('stop-btn').addEventListener('click', () => (isRunning = false));

  // initialize game
  frameRate(10);
  cells = make2DArray();
  isRunning = false;
}

function draw() {
  // background(255);
  showCells();

  if (isRunning) {
    run();
  }
}

function run() {
  let newCells = make2DArray();

  for (let i = 0; i < cells.length; i++) {
    for (let j = 0; j < cells[i].length; j++) {
      let neighours = countNeighbours(i, j);

      // if (i - 1 >= 0 && cells[i - 1][j] === STATE.alive) neighours++; // top
      // if (i + 1 < cells.length && cells[i + 1][j] === STATE.alive) neighours++; // bottom
      // if (j - 1 >= 0 && cells[i][j - 1] === STATE.alive) neighours++; // left
      // if (j + 1 < cells[0].length && cells[i][j + 1] === STATE.alive) neighours++; // right
      // if (i - 1 >= 0 && j - 1 >= 0 && cells[i - 1][j - 1] === STATE.alive) neighours++; // top-left
      // if (i - 1 >= 0 && j + 1 < cells[0].length && cells[i - 1][j + 1] === STATE.alive) neighours++; // top-right
      // if (i + 1 < cells.length && j - 1 >= 0 && cells[i + 1][j - 1] === STATE.alive) neighours++; // bottom-left
      // if (i + 1 < cells.length && j + 1 < cells[0].length && cells[i + 1][j + 1] === STATE.alive) neighours++; // bottom-right

      if (cells[i][j] === STATE.alive && 2 <= neighours && neighours <= 3) {
        newCells[i][j] = STATE.alive;
      } else if (cells[i][j] === STATE.dead && neighours === 3) {
        newCells[i][j] = STATE.alive;
      } else {
        newCells[i][j] = STATE.dead;
      }
    }
  }

  cells = newCells;
}

function countNeighbours(y, x) {
  let count = 0;
  let nRows = cells.length;
  let nCols = cells[0].length;

  for (let i = -1; i < 2; i++) {
    for (let j = -1; j < 2; j++) {
      let row = (y + i + nRows) % nRows;
      let col = (x + j + nCols) % nCols;
      if (cells[row][col] === STATE.alive) count++;
    }
  }

  if (cells[y][x] === STATE.alive) count--;
  return count;
}

function showCells() {
  // stroke(0, 100);
  // // vertical lines
  // for (let i = 1; i < grid.length; i++) {
  //   line(i * cellSize, 0, i * cellSize, height);
  // }
  // // horizontal lines
  // for (let i = 1; i < grid[0].length; i++) {
  //   line(0, i * cellSize, width, i * cellSize);
  // }

  for (let y = 0; y < cells.length; y++) {
    for (let x = 0; x < cells[y].length; x++) {
      if (cells[y][x] === STATE.alive) {
        // dead cells are white
        fill(0);
      } else if (cells[y][x] === STATE.dead) {
        // alive cells are black
        fill(255);
      }
      rect(cellSize * x, cellSize * y, cellSize, cellSize);
    }
  }
}

// changes the selected cell's state
function mousePressed() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    let x = floor(mouseX / cellSize);
    let y = floor(mouseY / cellSize);

    if (cells[y][x] === STATE.dead) {
      drawingState = STATE.alive;
    } else if (cells[y][x] === STATE.alive) {
      drawingState = STATE.dead;
    }
    cells[y][x] = drawingState;
  }
}

// enables changing the state for multiple cells by dragging the mouse
function mouseDragged() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    let x = floor(mouseX / cellSize);
    let y = floor(mouseY / cellSize);

    cells[y][x] = drawingState;
  }
}
