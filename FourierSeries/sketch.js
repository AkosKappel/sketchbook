let angle;
let wave;
let shape;

const radius = 100;
const waveLength = 900; // length of the vizualized wave
const angularSpeed = 0.03;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas-container');

  angle = 0;
  wave = [];
  shape = [];
}

function draw() {
  background(0);
  translate(450, 450);

  squareWave(3);
  // sawtoothWave(3);

  wave = wave.slice(0, waveLength);
  shape = shape.slice(0, waveLength);
  angle -= angularSpeed;
  angle %= TWO_PI;
}

function squareWave(numEpicycles) {
  let x = 0;
  let y = 0;

  for (let n = 1; n < 2 * numEpicycles; n += 2) {
    // previous circle's center
    let prevX = x;
    let prevY = y;

    let r = radius * (4 / (n * PI));
    x += r * cos(n * angle);
    y += r * sin(n * angle);

    stroke(255, 100);
    noFill();
    ellipse(prevX, prevY, 2 * r);

    stroke(255, 200);
    line(prevX, prevY, x, y);
  }

  wave.unshift(y);
  shape.push({ x, y });
  drawImage(x, y);
}

function sawtoothWave(numEpicycles) {
  let x = 0;
  let y = 0;
  let sign = -1;

  for (let n = 1; n <= numEpicycles; n++) {
    // previous circle's center
    let prevX = x;
    let prevY = y;

    let r = radius * (2 / (sign * n * PI));
    x += r * cos(n * angle);
    y += r * sin(n * angle);

    stroke(255, 100);
    noFill();
    ellipse(prevX, prevY, 2 * r);

    stroke(255, 100);
    line(prevX, prevY, x, y);
    sign *= -1;
  }

  wave.unshift(y);
  shape.unshift({ x, y });
  drawImage(x, y);
}

function drawImage(x, y) {
  // line connecting the circle with the wave
  let imageDistance = 400; // distance from the circle to the wave
  line(x, y, imageDistance, y);

  // drawing the shape around the circles
  stroke(255, 0, 0);
  beginShape();
  noFill();
  // NOTE: without the -1 it draws an auditional line
  for (let i = 0; i < shape.length - 1; i++) {
    vertex(shape[i].x, shape[i].y);
  }
  endShape();

  translate(imageDistance, 0);

  // drawing the wave
  stroke(255);
  beginShape();
  noFill();
  for (let i = 0; i < wave.length; i++) {
    vertex(i, wave[i]);
  }
  endShape();
}
