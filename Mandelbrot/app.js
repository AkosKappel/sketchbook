const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const paletteSelect = document.getElementById('palette');
const iterationsInput = document.getElementById('iterations');
const zoomOutput = document.getElementById('zoom');
const hint = document.getElementById('hint');
const defaultHint = hint.textContent;

// Cosine palettes: color(t) = a + b * cos(2π(c * t + d)) per channel, a compact way to get smooth gradients.
const PALETTES = {
  ember: [
    [0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5],
    [1, 1, 1],
    [0, 0.1, 0.2],
  ],
  ocean: [
    [0.2, 0.5, 0.7],
    [0.2, 0.4, 0.3],
    [1, 1, 1],
    [0, 0.15, 0.2],
  ],
  rainbow: [
    [0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5],
    [1, 1, 1],
    [0, 0.33, 0.67],
  ],
};
const INSIDE = [12, 17, 28];
// Below this many complex units per pixel, doubles run out of precision and the image turns blocky.
const MIN_SCALE = 1e-14;

let width = 0; // device pixels
let height = 0;
let view = null; // { x, y, scale }: complex number at the canvas center and complex units per device pixel
let initialScale = 1;
let image = null;
let row = 0; // next row to render
let colors = new Uint8ClampedArray(0); // palette lookup, 3 bytes per entry

// The last complete render and the view it shows, stretched as a preview while the next one renders.
const snapshot = document.createElement('canvas');
let snapshotView = null;

function buildPalette() {
  const [a, b, c, d] = PALETTES[paletteSelect.value];
  const size = 1024;
  colors = new Uint8ClampedArray(size * 3);
  for (let i = 0; i < size; i++) {
    for (let channel = 0; channel < 3; channel++) {
      const t = i / size;
      colors[i * 3 + channel] = 255 * (a[channel] + b[channel] * Math.cos(2 * Math.PI * (c[channel] * t + d[channel])));
    }
  }
}

function resetView() {
  initialScale = Math.max(3.4 / width, 2.6 / height);
  setView({ x: -0.65, y: 0, scale: initialScale });
}

function setView(next) {
  view = { ...next, scale: Math.max(next.scale, MIN_SCALE) };
  hint.textContent = view.scale === MIN_SCALE ? 'This is as deep as the numbers go' : defaultHint;
  const zoom = initialScale / view.scale;
  zoomOutput.value = zoom < 1e4 ? `${Math.round(zoom)}×` : `${zoom.toExponential(1)}×`;
  restart();
}

function restart() {
  row = 0;
  if (snapshotView) {
    // stretch the last complete image into place so zooming and panning feel instant
    const ratio = snapshotView.scale / view.scale;
    const left = (snapshotView.x - view.x) / view.scale + width / 2 - (width / 2) * ratio;
    const top = (snapshotView.y - view.y) / view.scale + height / 2 - (height / 2) * ratio;
    ctx.fillStyle = `rgb(${INSIDE})`;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(snapshot, left, top, width * ratio, height * ratio);
  }
}

// Renders rows until the frame budget is used up, so the page stays responsive during deep zooms.
function renderRows() {
  const maxIterations = Number(iterationsInput.value);
  const data = image.data;
  const startRow = row;
  const deadline = performance.now() + 12;

  while (row < height && performance.now() < deadline) {
    const ci = view.y + (row - height / 2) * view.scale;
    for (let column = 0; column < width; column++) {
      const cr = view.x + (column - width / 2) * view.scale;
      let zr = 0;
      let zi = 0;
      let iteration = 0;
      // z = z² + c until z escapes; a large escape radius makes the smooth coloring below accurate
      while (zr * zr + zi * zi < 256 && iteration < maxIterations) {
        const nextZr = zr * zr - zi * zi + cr;
        zi = 2 * zr * zi + ci;
        zr = nextZr;
        iteration++;
      }

      const offset = (row * width + column) * 4;
      if (iteration === maxIterations) {
        data.set(INSIDE, offset);
      } else {
        // fractional escape count, so the colors blend instead of forming bands
        const smooth = iteration + 1 - Math.log2(Math.log2(zr * zr + zi * zi) / 2);
        const index = (Math.floor(Math.sqrt(smooth) * 64) % 1024) * 3;
        // points that escape fast fade into the dark background, the detail near the set stays bright
        const fade = Math.min(1, smooth / 12);
        data[offset] = colors[index] * fade;
        data[offset + 1] = colors[index + 1] * fade;
        data[offset + 2] = colors[index + 2] * fade;
      }
      data[offset + 3] = 255;
    }
    row++;
  }

  ctx.putImageData(image, 0, 0, 0, startRow, width, row - startRow);
  if (row === height) {
    snapshot.getContext('2d').drawImage(canvas, 0, 0);
    snapshotView = { ...view };
  }
}

function animate() {
  if (view && row < height) renderRows();
  requestAnimationFrame(animate);
}

// Zooms by `factor` while keeping the point under (px, py) in place.
function zoomAt(px, py, factor) {
  const pointX = view.x + (px - width / 2) * view.scale;
  const pointY = view.y + (py - height / 2) * view.scale;
  const scale = view.scale / factor;
  setView({ x: pointX - (px - width / 2) * scale, y: pointY - (py - height / 2) * scale, scale });
}

const devicePoint = (event) => {
  const ratio = width / canvas.clientWidth;
  return [event.offsetX * ratio, event.offsetY * ratio];
};

// A press that barely moves is a click (zoom in), anything longer is a drag (pan).
let drag = null;
canvas.addEventListener('pointerdown', (event) => {
  canvas.setPointerCapture(event.pointerId);
  drag = { start: devicePoint(event), view: { ...view }, moved: false };
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const [x, y] = devicePoint(event);
  const dx = x - drag.start[0];
  const dy = y - drag.start[1];
  if (!drag.moved && Math.hypot(dx, dy) < 6) return;
  drag.moved = true;
  setView({ ...drag.view, x: drag.view.x - dx * view.scale, y: drag.view.y - dy * view.scale });
});
canvas.addEventListener('pointerup', (event) => {
  if (drag && !drag.moved) zoomAt(...devicePoint(event), event.button === 2 || event.altKey ? 0.5 : 2);
  drag = null;
});
canvas.addEventListener('pointercancel', () => (drag = null));
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    zoomAt(...devicePoint(event), Math.exp(-event.deltaY * 0.002));
  },
  { passive: false },
);

document.getElementById('zoom-out').addEventListener('click', () => zoomAt(width / 2, height / 2, 0.5));
document.getElementById('reset').addEventListener('click', resetView);
paletteSelect.addEventListener('change', () => {
  buildPalette();
  restart();
});
iterationsInput.addEventListener('change', restart);

fillStage(canvas, () => {
  // work in device pixels: the image is written with putImageData, which ignores transforms
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  width = canvas.width;
  height = canvas.height;
  image = ctx.createImageData(width, height);
  snapshot.width = width;
  snapshot.height = height;
  snapshotView = null;
  if (view) {
    restart();
  } else {
    resetView();
  }
});
buildPalette();
requestAnimationFrame(animate);
