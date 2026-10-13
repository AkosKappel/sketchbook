const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const showImage = document.getElementById('show-image');

const width = 960;
const height = 540;
const particleCount = 10000;
const speed = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.4 : 1;

canvas.width = width;
canvas.height = height;
fitCanvas(canvas, width, height);

// The current image letterboxed into the canvas size, also blended in faintly when "Show source image" is on.
const source = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
source.canvas.width = width;
source.canvas.height = height;
let sourcePixels = new Uint8ClampedArray(width * height * 4);

// Perceived brightness (0 to 2.55) of every pixel, indexed by y * width + x.
const brightness = new Float32Array(width * height);

// Particles are blended straight into this pixel buffer instead of being drawn with canvas calls:
// ten thousand fillStyle changes and fills per frame were too slow.
const frame = ctx.createImageData(width, height);
const pixels = frame.data;

// Blends a color into one pixel of the frame with the given opacity (0 to 1).
function blend(index, red, green, blue, alpha) {
  const i = index * 4;
  pixels[i] += (red - pixels[i]) * alpha;
  pixels[i + 1] += (green - pixels[i + 1]) * alpha;
  pixels[i + 2] += (blue - pixels[i + 2]) * alpha;
}

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

  // A small dot in the color of the image underneath, more opaque over bright pixels.
  draw() {
    const pixel = this.pixel;
    const alpha = Math.min(brightness[pixel] * 0.5, 1);
    if (alpha === 0) return;
    const red = sourcePixels[pixel * 4];
    const green = sourcePixels[pixel * 4 + 1];
    const blue = sourcePixels[pixel * 4 + 2];
    const r = this.size;
    for (let y = Math.max(0, Math.ceil(this.y - r)); y <= Math.min(height - 1, this.y + r); y++) {
      for (let x = Math.max(0, Math.ceil(this.x - r)); x <= Math.min(width - 1, this.x + r); x++) {
        if ((x - this.x) ** 2 + (y - this.y) ** 2 <= r * r) blend(y * width + x, red, green, blue, alpha);
      }
    }
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

  sourcePixels = source.getImageData(0, 0, width, height).data;
  for (let i = 0; i < brightness.length; i++) {
    const red = sourcePixels[i * 4];
    const green = sourcePixels[i * 4 + 1];
    const blue = sourcePixels[i * 4 + 2];
    brightness[i] = Math.sqrt(red * red * 0.299 + green * green * 0.587 + blue * blue * 0.114) / 100;
  }
  // black, fully opaque
  for (let i = 0; i < pixels.length; i++) pixels[i] = i % 4 === 3 ? 255 : 0;
}

function animate() {
  // Fading every pixel a little towards black leaves trails behind the particles. Rounding down
  // (rather than to the nearest value) lets dim pixels reach black instead of leaving ghosts.
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = (pixels[i] * 243) >> 8;
    pixels[i + 1] = (pixels[i + 1] * 243) >> 8;
    pixels[i + 2] = (pixels[i + 2] * 243) >> 8;
  }
  if (showImage.checked) {
    for (let i = 0; i < brightness.length; i++) {
      blend(i, sourcePixels[i * 4], sourcePixels[i * 4 + 1], sourcePixels[i * 4 + 2], 0.04);
    }
  }
  for (const particle of particles) {
    particle.update();
    particle.draw();
  }
  ctx.putImageData(frame, 0, 0);
  requestAnimationFrame(animate);
}

setupImageInput('octane.jpg', mapImage);
requestAnimationFrame(animate);
