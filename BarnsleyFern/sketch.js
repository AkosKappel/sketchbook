const WIDTH = 480;
const HEIGHT = 900;
const MARGIN = 24;
const TOTAL_POINTS = 300000;
// the fern lies within -2.1820 < x < 2.6558 and 0 <= y < 9.9983
const BOUNDS = { minX: -2.182, maxX: 2.6558, maxY: 9.9983 };

const speedInput = document.getElementById('speed');
const progressOutput = document.getElementById('progress');

let x;
let y;
let drawn;
let pixelsPerUnit;
let offsetX;

function setup() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  canvas.parent(document.querySelector('.stage'));
  fitCanvas(canvas.elt, WIDTH, HEIGHT);

  const fernWidth = BOUNDS.maxX - BOUNDS.minX;
  pixelsPerUnit = min((WIDTH - 2 * MARGIN) / fernWidth, (HEIGHT - 2 * MARGIN) / BOUNDS.maxY);
  offsetX = (WIDTH - fernWidth * pixelsPerUnit) / 2;

  stroke(94, 230, 160, 70);
  strokeWeight(1);
  document.getElementById('restart').addEventListener('click', restart);
  restart();
}

function restart() {
  background(16, 20, 28);
  x = 0;
  y = 0;
  drawn = 0;
  loop();
}

function draw() {
  const count = min(Number(speedInput.value), TOTAL_POINTS - drawn);
  for (let i = 0; i < count; i++) {
    point(offsetX + (x - BOUNDS.minX) * pixelsPerUnit, HEIGHT - MARGIN - y * pixelsPerUnit);
    nextPoint();
  }
  drawn += count;

  progressOutput.value = `${floor((100 * drawn) / TOTAL_POINTS)}%`;
  if (drawn >= TOTAL_POINTS) noLoop();
}

function nextPoint() {
  const r = random();
  let nextX;
  let nextY;

  if (r < 0.01) {
    // stem
    nextX = 0;
    nextY = 0.16 * y;
  } else if (r < 0.86) {
    // successively smaller leaflets
    nextX = 0.85 * x + 0.04 * y;
    nextY = -0.04 * x + 0.85 * y + 1.6;
  } else if (r < 0.93) {
    // largest left-hand leaflet
    nextX = 0.2 * x - 0.26 * y;
    nextY = 0.23 * x + 0.22 * y + 1.6;
  } else {
    // largest right-hand leaflet
    nextX = -0.15 * x + 0.28 * y;
    nextY = 0.26 * x + 0.24 * y + 0.44;
  }

  x = nextX;
  y = nextY;
}
