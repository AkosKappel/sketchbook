let x = 0;
let y = 0;

function setup() {
  createCanvas(600, 600);
  background(0);
}

// range −2.1820 < x < 2.6558 and 0 ≤ y < 9.9983
function drawPoint() {
  stroke(255);
  strokeWeight(1);
  let px = map(x, -2.182, 2.6558, 0, width);
  let py = map(y, 0, 9.9983, height, 0);
  point(px, py);
}

function nextPoint() {
  let nextX;
  let nextY;

  let r = random(1);

  if (r < 0.01) {
    // f1
    nextX = 0;
    nextY = 0.16 * y;
  } else if (r < 0.86) {
    // f2
    nextX = 0.85 * x + 0.04 * y;
    nextY = -0.04 * x + 0.85 * y + 1.6;
  } else if (r < 0.93) {
    // f3
    nextX = 0.2 * x + -0.26 * y;
    nextY = 0.23 * x + 0.22 * y + 1.6;
  } else {
    // f4
    nextX = -0.15 * x + 0.28 * y;
    nextY = 0.26 * x + 0.24 * y + 0.44;
  }

  x = nextX;
  y = nextY;
}

function draw() {
  for (let i = 0; i < 1000; i++) {
    drawPoint();
    nextPoint();
  }
}
