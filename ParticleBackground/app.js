const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let particleArray = [];

// mouse
const mouse = {
  x: null,
  y: null,
  radius: (canvas.height / 100) * (canvas.width / 100),
};

window.addEventListener('mousemove', function (event) {
  mouse.x = event.x;
  mouse.y = event.y;
});

class Particle {
  constructor(x, y, directionX, directionY, size, color) {
    this.x = x;
    this.y = y;
    this.directionX = directionX;
    this.directionY = directionY;
    this.size = size;
    this.color = color;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
    ctx.fillStyle = '#8C5523';
    ctx.fill();
  }

  update() {
    // check if particle is still within canvas
    if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
    if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;

    // collision detection for mouse and particle
    let dx = mouse.x - this.x;
    let dy = mouse.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const repulsiveForce = 5;

    if (distance < mouse.radius + this.size) {
      if (mouse.x < this.x && this.x < canvas.width - this.size * 10) this.x += repulsiveForce;
      if (mouse.x > this.x && this.x > this.size * 10) this.x -= repulsiveForce;
      if (mouse.y < this.y && this.y < canvas.height - this.size * 10) this.y += repulsiveForce;
      if (mouse.y > this.y && this.y > this.size * 10) this.y -= repulsiveForce;
    }

    // move particle
    this.x += this.directionX;
    this.y += this.directionY;

    this.draw();
  }
}

// create particles
function init() {
  particleArray = [];
  const numberOfParticles = (canvas.height * canvas.width) / 9000;

  for (let i = 0; i < numberOfParticles; i++) {
    let size = Math.random() * 5 + 1;
    let x = Math.random() * (innerWidth - size * 4) + size * 2;
    let y = Math.random() * (innerHeight - size * 4) + size * 2;
    let directionX = Math.random() * 5 - 2.5;
    let directionY = Math.random() * 5 - 2.5;
    let color = '#8C5523';

    particleArray.push(new Particle(x, y, directionX, directionY, size, color));
  }
}

function animate() {
  requestAnimationFrame(animate);
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  for (const particle of particleArray) {
    particle.update();
  }
  connect();
}

// check if particles are close enough to draw line between them
function connect() {
  let opacityValue = 1;

  for (let i = 0; i < particleArray.length; i++) {
    for (let j = i + 1; j < particleArray.length; j++) {
      const distance = (particleArray[i].x - particleArray[j].x) ** 2 + (particleArray[i].y - particleArray[j].y) ** 2;

      if (distance < (canvas.width / 7) * (canvas.height / 7)) {
        opacityValue = 1 - distance / 20000;
        ctx.strokeStyle = `rgba(140, 85, 31, ${opacityValue})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particleArray[i].x, particleArray[i].y);
        ctx.lineTo(particleArray[j].x, particleArray[j].y);
        ctx.stroke();
      }
    }
  }
}

// resize event
window.addEventListener('resize', function () {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  mouse.radius = (canvas.height / 100) * (canvas.width / 100);
  init();
});

// mouse out event
window.addEventListener('mouseout', function () {
  mouse.x = undefined;
  mouse.y = undefined;
});

init();
animate();
