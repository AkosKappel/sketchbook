let canvas;
let button;
let gameResult;
let difficulty;

function setup() {
  getDocumentObjectModels();

  canvas = createCanvas(cnvWidth, cnvHeight);
  canvas.parent('sketch-holder');
  button.addEventListener('click', resetGame);

  strokeWeight(4); // line thickness
}

function getDocumentObjectModels() {
  button = document.getElementById('reset-btn');
  gameResult = document.getElementById('game-result');
  difficulty = document.getElementById('difficulty');
}

function draw() {
  drawGrid();
  drawCells();
}

function mousePressed() {
  // click on canvas
  if (inRange(mouseX, 0, cnvWidth) && inRange(mouseY, 0, cnvHeight)) {
    if (currentPlayer === human) {
      let j = floor(mouseX / cellWidth);
      let i = floor(mouseY / cellHeight);

      if (board[i][j] === emptyCell) {
        board[i][j] = human;

        result = checkWinner();
        if (result !== null) {
          displayWinner();
          noLoop();
          return;
        }
        currentPlayer = bot;

        if (difficulty.value === 'easy') {
          randomMove();
        } else if (difficulty.value === 'medium') {
          goodMove();
        } else if (difficulty.value === 'hard') {
          bestMove();
        }

        result = checkWinner();
        if (result !== null) {
          displayWinner();
          noLoop();
          return;
        }
        currentPlayer = human;
      }
    }
  }
}
