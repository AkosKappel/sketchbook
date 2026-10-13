// Each term k contributes a circle with the given harmonic (rotation speed) and
// amplitude, relative to a wave of height 1. These are the standard sine series.
const SERIES = {
  square: (k) => {
    const n = 2 * k - 1;
    return { harmonic: n, amplitude: 4 / (PI * n) };
  },
  sawtooth: (k) => ({ harmonic: k, amplitude: (k % 2 ? 2 : -2) / (PI * k) }),
  triangle: (k) => {
    const n = 2 * k - 1;
    return { harmonic: n, amplitude: (k % 2 ? 8 : -8) / (PI * PI * n * n) };
  },
};
const PERIODS_SHOWN = 2;

const waveSelect = document.getElementById('wave');
const termsInput = document.getElementById('terms');
const termsOutput = document.getElementById('terms-value');
const speedInput = document.getElementById('speed');
const stage = document.querySelector('.stage');

let angle = 0;
let trail = []; // newest first, positions of the outermost circle's tip
let layout;

function setup() {
  createCanvas(stage.clientWidth, stage.clientHeight).parent(stage);
  updateLayout();
  new ResizeObserver(() => {
    resizeCanvas(stage.clientWidth, stage.clientHeight);
    updateLayout();
  }).observe(stage);

  for (const input of [waveSelect, termsInput, speedInput]) {
    input.addEventListener('input', () => {
      termsOutput.value = termsInput.value;
      trail = [];
    });
  }
}

// The drawing is laid out for a landscape frame. On portrait screens that frame is turned a quarter
// turn, so the circles sit at the top and the wave runs down the screen.
function updateLayout() {
  const portrait = height > width;
  const [frameWidth, frameHeight] = portrait ? [height, width] : [width, height];
  const pad = 16;
  const radius = min(frameHeight * 0.3, frameWidth * 0.16);
  const centerX = pad + radius * 1.5;
  const waveOffset = radius * 1.9; // from the circles' center to the start of the wave
  const waveWidth = frameWidth - pad - centerX - waveOffset;
  layout = { portrait, frameHeight, radius, centerX, centerY: frameHeight / 2, waveOffset, waveWidth };
  trail = [];
}

function draw() {
  background(16, 20, 28);
  const { portrait, frameHeight, radius, centerX, centerY, waveOffset, waveWidth } = layout;
  const speed = Number(speedInput.value);
  const samplesPerPeriod = ceil(TWO_PI / speed);
  const sampleSpacing = waveWidth / (PERIODS_SHOWN * samplesPerPeriod);
  if (portrait) {
    translate(width, 0);
    rotate(HALF_PI);
  }
  translate(centerX, centerY);

  // Near the jumps of the square and sawtooth waves the circles swing far sideways,
  // so they are clipped to their own panel instead of spilling over the wave.
  const panelRight = waveOffset - 12;
  push();
  beginClip();
  rect(-centerX, -centerY, centerX + panelRight, frameHeight);
  endClip();

  noFill();
  let x = 0;
  let y = 0;
  for (let k = 1; k <= Number(termsInput.value); k++) {
    const { harmonic, amplitude } = SERIES[waveSelect.value](k);
    const r = radius * amplitude;
    const nextX = x + r * cos(harmonic * angle);
    const nextY = y + r * sin(harmonic * angle);

    stroke(255, 255, 255, 40);
    strokeWeight(1);
    circle(x, y, 2 * abs(r));
    stroke(255, 255, 255, 150);
    line(x, y, nextX, nextY);

    x = nextX;
    y = nextY;
  }

  trail.unshift({ x, y });
  trail.length = min(trail.length, PERIODS_SHOWN * samplesPerPeriod + 1);

  strokeWeight(2);
  stroke(245, 185, 66);
  beginShape();
  for (const tip of trail.slice(0, samplesPerPeriod + 1)) vertex(tip.x, tip.y);
  endShape();

  noStroke();
  fill(245, 185, 66);
  circle(x, y, 8);
  pop();

  stroke(255, 255, 255, 70);
  strokeWeight(1);
  line(min(x, panelRight), y, waveOffset, y);

  noFill();
  strokeWeight(2);
  stroke(94, 230, 160);
  beginShape();
  trail.forEach((tip, i) => vertex(waveOffset + i * sampleSpacing, tip.y));
  endShape();

  noStroke();
  fill(94, 230, 160);
  circle(waveOffset, y, 8);

  angle = (angle - speed) % TWO_PI;
}
