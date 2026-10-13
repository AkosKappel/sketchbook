let ball;
let leftPaddle;
let rightPaddle;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas-container');

  ball = new Ball();
  leftPaddle = new Paddle(SIDE.left);
  rightPaddle = new Paddle(SIDE.right);

  frameRate(60);
}

function draw() {
  background(50);

  ball.show();
  ball.update();

  leftPaddle.show();
  leftPaddle.update();

  rightPaddle.show();
  rightPaddle.update();

  showStats();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  leftPaddle.fixOffset();
  rightPaddle.fixOffset();
}

function showStats() {
  fill(255);
  noStroke();
  textSize(32);
  textAlign(CENTER, TOP);
  text(`Available points: ${stats.numBounces}`, width / 2, 10);

  fill('lightblue');
  text(stats.leftPlayerScore, width / 2 - 50, 50);

  fill('orange');
  text(stats.rightPlayerScore, width / 2 + 50, 50);
}

const stats = {
  leftPlayerScore: 0,
  rightPlayerScore: 0,
  numBounces: 0,
};
