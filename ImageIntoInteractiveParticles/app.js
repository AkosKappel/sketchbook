const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const stage = canvas.parentElement;
const hint = document.getElementById('hint');
const defaultHint = hint.textContent;
const fileInput = document.getElementById('image-file');
const resetButton = document.getElementById('reset-image');

const maxScale = 4;
// Larger images are downscaled to this many particles along their longest side to keep the frame rate up.
const maxGridSize = 110;
const returnSpeed = 0.05;
const pointer = { x: 0, y: 0, active: false };
let width = 0;
let height = 0;
let scale = maxScale;
let grid = { width: 0, height: 0, pixels: [] };
let particles = [];

class Particle {
  constructor(x, y, color) {
    this.baseX = x;
    this.baseY = y;
    this.x = x;
    this.y = y;
    this.color = color;
    this.density = Math.random() * 10 + 2;
  }

  update() {
    const radius = scale * 25;
    const dx = pointer.x - this.x;
    const dy = pointer.y - this.y;
    const distance = Math.hypot(dx, dy);

    if (pointer.active && distance > 0 && distance < radius) {
      // Closer particles are pushed harder, scaled so the effect looks the same at any size.
      const force = ((radius - distance) / radius) * this.density * 0.15 * scale;
      this.x -= (dx / distance) * force;
      this.y -= (dy / distance) * force;
    } else {
      this.x -= (this.x - this.baseX) * returnSpeed;
      this.y -= (this.y - this.baseY) * returnSpeed;
    }
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, scale / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Samples the image into a grid of { x, y, color }, skipping transparent and near-black pixels
// because they would be invisible on the dark background anyway.
function sampleImage(image) {
  const downscale = Math.min(1, maxGridSize / Math.max(image.naturalWidth, image.naturalHeight));
  const gridWidth = Math.max(1, Math.round(image.naturalWidth * downscale));
  const gridHeight = Math.max(1, Math.round(image.naturalHeight * downscale));
  const buffer = document.createElement('canvas').getContext('2d');
  buffer.canvas.width = gridWidth;
  buffer.canvas.height = gridHeight;
  buffer.imageSmoothingQuality = 'high';
  buffer.drawImage(image, 0, 0, gridWidth, gridHeight);
  const { data } = buffer.getImageData(0, 0, gridWidth, gridHeight);

  const pixels = [];
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const i = (y * gridWidth + x) * 4;
      const [red, green, blue, alpha] = data.subarray(i, i + 4);
      if (alpha > 128 && red + green + blue > 30) {
        pixels.push({ x, y, color: `rgb(${red} ${green} ${blue})` });
      }
    }
  }
  return { width: gridWidth, height: gridHeight, pixels };
}

function layout() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = stage.clientWidth;
  height = stage.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  scale = Math.min(maxScale, (width * 0.9) / grid.width, (height * 0.85) / grid.height);
  const left = (width - grid.width * scale) / 2;
  const top = (height - grid.height * scale) / 2;
  particles = grid.pixels.map((pixel) => new Particle(left + pixel.x * scale, top + pixel.y * scale, pixel.color));
}

function animate() {
  // Translucent fill leaves short trails behind moving particles.
  ctx.fillStyle = 'rgb(11 13 18 / 0.25)';
  ctx.fillRect(0, 0, width, height);
  for (const particle of particles) {
    particle.update();
    particle.draw();
  }
  requestAnimationFrame(animate);
}

function trackPointer(event) {
  pointer.x = event.offsetX;
  pointer.y = event.offsetY;
  pointer.active = true;
}

async function loadImage(src) {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

async function useImage(src, isDefault) {
  try {
    grid = sampleImage(await loadImage(src));
    layout();
    hint.textContent = defaultHint;
    resetButton.hidden = isDefault;
  } catch {
    hint.textContent = 'That image could not be loaded. Try a JPEG, PNG or WebP file.';
  }
}

async function useFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    hint.textContent = 'That file is not an image.';
    return;
  }
  const url = URL.createObjectURL(file);
  await useImage(url, false);
  URL.revokeObjectURL(url);
}

canvas.addEventListener('pointermove', trackPointer);
canvas.addEventListener('pointerdown', trackPointer);
canvas.addEventListener('pointerleave', () => {
  pointer.active = false;
});

document.getElementById('pick-image').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  useFile(fileInput.files[0]);
  // Clearing lets the same file be picked again after a reset.
  fileInput.value = '';
});
resetButton.addEventListener('click', () => useImage('vault-boy.png', true));

// Listening on the whole page also stops a missed drop from navigating away to the file.
document.addEventListener('dragover', (event) => event.preventDefault());
document.addEventListener('drop', (event) => {
  event.preventDefault();
  useFile(event.dataTransfer.files[0]);
});

new ResizeObserver(layout).observe(stage);
useImage('vault-boy.png', true);
requestAnimationFrame(animate);
