const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const hint = document.getElementById('hint');
const defaultHint = hint.textContent;
const fileInput = document.getElementById('image-file');
const resetButton = document.getElementById('reset-image');
const showImage = document.getElementById('show-image');

const width = 960;
const height = 540;
const particleCount = 10000;
const speed = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.4 : 1;

canvas.width = width;
canvas.height = height;
fitCanvas(canvas, width, height);

// The current image letterboxed into the canvas size, also drawn faintly when "Show source image" is on.
const source = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
source.canvas.width = width;
source.canvas.height = height;

// Perceived brightness (0 to 2.55) and color of every pixel, indexed by y * width + x.
const brightness = new Float32Array(width * height);
const colors = new Array(width * height).fill('#000');

class Particle {
  constructor() {
    this.reset();
    this.y = Math.random() * height;
    this.velocity = Math.random() * 0.5;
    this.size = Math.random() * 1.5 + 1;
  }

  reset() {
    this.x = Math.random() * width;
    this.y = 0;
  }

  get pixel() {
    return Math.floor(this.y) * width + Math.floor(this.x);
  }

  update() {
    // Bright pixels slow particles down, but they never stop or move up.
    this.y += Math.max(2.5 - brightness[this.pixel] + this.velocity, 0.1) * speed;
    if (this.y >= height) this.reset();
  }

  draw() {
    const pixel = this.pixel;
    ctx.globalAlpha = Math.min(brightness[pixel] * 0.5, 1);
    ctx.fillStyle = colors[pixel];
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

const particles = Array.from({ length: particleCount }, () => new Particle());

function mapImage(image) {
  // Contain: the whole image stays visible and undistorted, with black bars where the aspect ratio differs.
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const imageWidth = image.naturalWidth * scale;
  const imageHeight = image.naturalHeight * scale;
  source.fillStyle = '#000';
  source.fillRect(0, 0, width, height);
  source.drawImage(image, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);

  const { data } = source.getImageData(0, 0, width, height);
  for (let i = 0; i < brightness.length; i++) {
    const red = data[i * 4];
    const green = data[i * 4 + 1];
    const blue = data[i * 4 + 2];
    brightness[i] = Math.sqrt(red * red * 0.299 + green * green * 0.587 + blue * blue * 0.114) / 100;
    colors[i] = `rgb(${red} ${green} ${blue})`;
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
}

function animate() {
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  if (showImage.checked) {
    ctx.globalAlpha = 0.04;
    ctx.drawImage(source.canvas, 0, 0);
  }
  for (const particle of particles) {
    particle.update();
    particle.draw();
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(animate);
}

async function loadImage(src) {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

async function useImage(src, isDefault) {
  try {
    mapImage(await loadImage(src));
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

document.getElementById('pick-image').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  useFile(fileInput.files[0]);
  // Clearing lets the same file be picked again after a reset.
  fileInput.value = '';
});
resetButton.addEventListener('click', () => useImage('octane.jpg', true));

// Listening on the whole page also stops a missed drop from navigating away to the file.
document.addEventListener('dragover', (event) => event.preventDefault());
document.addEventListener('drop', (event) => {
  event.preventDefault();
  useFile(event.dataTransfer.files[0]);
});

useImage('octane.jpg', true);
requestAnimationFrame(animate);
