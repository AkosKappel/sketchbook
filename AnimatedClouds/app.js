const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particleArray = [];
const colors = ['white', 'rgba(255, 255, 255, 0.3)', 'rgba(173, 216, 230, 0.8)', 'rgba(211, 211, 211, 0.8)'];
const maxSize = 40;
const minSize = 0;
const mouseRadius = 60;

// mouse position
const mouse = {
  x: null,
  y: null,
};

window.addEventListener('mousemove', function (event) {
  mouse.x = event.x;
  mouse.y = event.y;
});

function Particle(x, y, directionX, directionY, size, color) {
  this.x = x;
  this.y = y;
  this.directionX = directionX;
  this.directionY = directionY;
  this.size = size;
  this.color = color;
}

Particle.prototype.draw = function () {
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
  // ctx.fillRect(this.x, this.y, this.size, this.size);
  ctx.fillStyle = this.color;
  ctx.fill();
  // ctx.strokeStyle = 'white';
  // ctx.stroke();
};

Particle.prototype.update = function () {
  if (this.x + this.size * 2 > canvas.width || this.x - this.size * 2 < 0) {
    this.directionX = -this.directionX;
  }
  if (this.y + this.size * 2 > canvas.height || this.y - this.size * 2 < 0) {
    this.directionY = -this.directionY;
  }

  this.x += this.directionX;
  this.y += this.directionY;

  // mouse interactivity
  if (
    mouse.x - this.x < mouseRadius &&
    mouse.x - this.x > -mouseRadius &&
    mouse.y - this.y < mouseRadius &&
    mouse.y - this.y > -mouseRadius
  ) {
    if (this.size < maxSize) {
      this.size += 3;
    }
  } else if (this.size > minSize) {
    this.size -= 0.3;
  }

  if (this.size < 0) {
    this.size = 0;
  }
  this.draw();
};

// create particles
function init() {
  particleArray = [];
  const numberOfParticles = 1000;

  for (let i = 0; i < numberOfParticles; i++) {
    let size = 0;
    let x = Math.random() * (innerWidth - size * 4) + size * 2;
    let y = Math.random() * (innerHeight - size * 4) + size * 2;
    let directionX = Math.random() * 0.2 - 0.1;
    let directionY = Math.random() * 0.2 - 0.1;
    let color = colors[Math.floor(Math.random() * colors.length)];

    particleArray.push(new Particle(x, y, directionX, directionY, size, color));
  }
}

// animation loop
function animate() {
  requestAnimationFrame(animate);
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  for (const particle of particleArray) {
    particle.update();
  }
}

window.addEventListener('resize', function () {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  init();
});

// remove mouse position periodically
setInterval(function () {
  mouse.x = undefined;
  mouse.y = undefined;
}, 1000);

init();
animate();
