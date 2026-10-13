const size = 800;
const capacity = 4;
const queryHalfSize = 70;

let qtree;
let points;
let queryAt = null; // center of the search box in canvas coordinates, null when hidden

const showTreeInput = document.getElementById('show-tree');
const totalOutput = document.getElementById('total');
const foundOutput = document.getElementById('found');
const checkedOutput = document.getElementById('checked');

function setup() {
  const canvas = createCanvas(size, size).parent(document.querySelector('.stage'));
  fitCanvas(canvas.elt, size, size);
  // the picture only changes on input, so draw on demand instead of every frame
  noLoop();

  clearPoints();
  addCluster(width / 2, height / 2, 1000);
  setupPointer(canvas.elt);

  document.getElementById('add').addEventListener('click', () => {
    addCluster(random(150, width - 150), random(150, height - 150), 250);
    redraw();
  });
  document.getElementById('clear').addEventListener('click', () => {
    clearPoints();
    redraw();
  });
  showTreeInput.addEventListener('change', () => redraw());
}

function clearPoints() {
  qtree = new QuadTree(new Rectangle(width / 2, height / 2, width / 2, height / 2), capacity);
  points = [];
}

function addPoint(x, y) {
  const point = new Point(x, y);
  // points outside the canvas are rejected by the tree
  if (qtree.insert(point)) points.push(point);
}

function addCluster(x, y, count) {
  for (let i = 0; i < count; i++) {
    addPoint(randomGaussian(x, width / 9), randomGaussian(y, height / 9));
  }
}

function draw() {
  background(16, 20, 28);

  if (showTreeInput.checked) {
    noFill();
    stroke(85, 140, 244, 90);
    strokeWeight(1);
    qtree.show();
  }

  stroke(154, 163, 181);
  strokeWeight(4);
  for (const p of points) point(p.x, p.y);

  let found = [];
  let checked = 0;
  if (queryAt) {
    const range = new Rectangle(queryAt.x, queryAt.y, queryHalfSize, queryHalfSize);
    ({ points: found, checked } = qtree.query(range));

    noFill();
    stroke(245, 185, 66);
    strokeWeight(2);
    rect(range.x - range.w, range.y - range.h, range.w * 2, range.h * 2);
    strokeWeight(7);
    for (const p of found) point(p.x, p.y);
  }

  totalOutput.value = points.length;
  foundOutput.value = found.length;
  checkedOutput.value = checked;
}

function setupPointer(canvas) {
  let down = null;

  const toCanvas = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height,
    };
  };

  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    queryAt = toCanvas(event);
    down = { x: event.clientX, y: event.clientY };
    if (event.pointerType === 'mouse') addPoint(queryAt.x, queryAt.y);
    redraw();
  });

  canvas.addEventListener('pointermove', (event) => {
    queryAt = toCanvas(event);
    // a mouse drag sprays points, on touch screens dragging only moves the search box
    if (down && event.pointerType === 'mouse') addPoint(queryAt.x, queryAt.y);
    redraw();
  });

  canvas.addEventListener('pointerup', (event) => {
    const isTap = down && dist(down.x, down.y, event.clientX, event.clientY) < 10;
    if (isTap && event.pointerType !== 'mouse') addPoint(queryAt.x, queryAt.y);
    down = null;
    redraw();
  });

  canvas.addEventListener('pointercancel', () => (down = null));

  canvas.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse') return;
    queryAt = null;
    redraw();
  });
}
