let cnv;
let vertexCountField;
let percentField;
let canRepeat;
let useColors;
let speedSlider;
let startBtn;
let pauseBtn;

let vertexColors;
let vertices;

let current;
let previousVertex;
let percent;
let stopped;

// TODO: https://en.wikipedia.org/wiki/Chaos_game

function setup() {
  cnv = createCanvas(900, 900);
  cnv.parent('canvas-holder');

  vertexCountField = document.getElementById('vertexCountField');
  percentField = document.getElementById('percentField');
  canRepeat = document.getElementById('canRepeat');
  useColors = document.getElementById('useColors');
  speedSlider = document.getElementById('speedSlider');

  startBtn = document.getElementById('start-btn');
  startBtn.addEventListener('click', start);
  pauseBtn = document.getElementById('pause-btn');
  pauseBtn.addEventListener('click', pause);

  start();
}

function draw() {
  for (let i = 0; i < speedSlider.value; i++) {
    chaosGame();
  }
}

function chaosGame() {
  let nextVertex = random(vertices);

  while (!canRepeat.checked && previousVertex === nextVertex) {
    nextVertex = random(vertices);
  }

  current.x = lerp(current.x, nextVertex.pos.x, percent);
  current.y = lerp(current.y, nextVertex.pos.y, percent);

  if (useColors.checked) {
    stroke(nextVertex.color);
  } else {
    stroke(0);
  }

  point(current.x, current.y);
  previousVertex = nextVertex;
}

function start() {
  background(255);
  strokeWeight(1); // size of dots (in pixels)

  stopped = true; // reset game
  pause();

  initColors(); // set colors
  initVertices(); // set vertices

  current = createVector(random(width), random(height));
  percent = parseFloat(percentField.value);

  if (isNaN(percent) || percent <= 0 || percent >= 1) {
    percent = 0.5;
  }

  for (const v of vertices) {
    v.show();
  }
}

function pause() {
  if (stopped) {
    loop();
    stopped = false;
    pauseBtn.innerHTML = 'Pause';
  } else {
    noLoop();
    stopped = true;
    pauseBtn.innerHTML = 'Unpause';
  }
}

function initVertices() {
  vertices = [];
  for (let i = 0; i < vertexCountField.value; i++) {
    let angle = (i * TWO_PI) / vertexCountField.value - PI / 2.0;
    vertices.push(new Vertex(angle, vertexColors[i]));
  }
}

function initColors(shuffleColors = true) {
  // basic colors
  vertexColors = [
    color(255, 0, 0),
    color(0, 255, 0),
    color(0, 0, 255),
    color(255, 255, 0),
    color(0, 255, 255),
    color(255, 0, 255),
  ];

  // if not enough colors add more random
  while (vertexColors.length < vertexCountField.value) {
    let r = floor(random(1) * 256);
    let g = floor(random(1) * 256);
    let b = floor(random(1) * 256);
    vertexColors.push(color(r, g, b));
  }

  // shuffle the colors
  if (shuffleColors) {
    let i = vertexColors.length;
    while (--i) {
      let j = floor(random(1) * (i + 1));
      let temp = vertexColors[i];
      vertexColors[i] = vertexColors[j];
      vertexColors[j] = temp;
    }
  }
}

class Vertex {
  constructor(angle, c) {
    this.pos = p5.Vector.fromAngle(angle);

    this.pos.mult(min(width, height) / 2 - 10); // resize
    this.pos.add(width / 2, height / 2); // move to center

    this.color = color(c);
  }

  show() {
    stroke(this.color);
    point(this.pos.x, this.pos.y);
  }
}
