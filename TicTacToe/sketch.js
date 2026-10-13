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
  if (result !== null) {
    return; // game over, wait for "Play again"
  }

  // click on canvas
  if (mouseX >= 0 && mouseX < cnvWidth && mouseY >= 0 && mouseY < cnvHeight) {
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
