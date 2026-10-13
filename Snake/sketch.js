const cellWidth = 30;
const cellHeight = 30;
let snake;
let apple;

function setup() {
  let canvas = createCanvas(1200, 900);
  canvas.parent('canvas-container');

  frameRate(10);
  snake = new Snake();
  apple = new Apple();
}

function draw() {
  showGrid();
  apple.show();
  snake.show();
  snake.update();

  if (snake.dead) {
    background(0, 0, 0);
    textSize(32);
    textAlign(CENTER, CENTER);
    text('Game Over', width / 2, height / 2);
    textSize(16);
    text('Press space to restart', width / 2, height / 2 + 32);
    noLoop();
  }
}

function keyPressed() {
  if (keyCode === UP_ARROW && snake.direction !== DIRECTION.down) {
    snake.direction = DIRECTION.up;
  }
  if (keyCode === DOWN_ARROW && snake.direction !== DIRECTION.up) {
    snake.direction = DIRECTION.down;
  }
  if (keyCode === LEFT_ARROW && snake.direction !== DIRECTION.right) {
    snake.direction = DIRECTION.left;
  }
  if (keyCode === RIGHT_ARROW && snake.direction !== DIRECTION.left) {
    snake.direction = DIRECTION.right;
  }
  if (snake.dead && key === ' ') {
    snake = new Snake();
    loop();
  }
}

function showGrid() {
  background(255);
  stroke(0, 0, 0, 100);

  // vertical lines
  for (let i = 1; i < width / cellWidth; i++) {
    line(cellWidth * i, 0, cellWidth * i, height);
  }

  // horizontal lines
  for (let i = 1; i < height / cellHeight; i++) {
    line(0, cellHeight * i, width, cellHeight * i);
  }
}

