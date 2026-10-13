const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particleArray = [];

class Particle {
  constructor(moveRadius, step, position) {
    this.moveRadius = moveRadius;
    this.step = step;
    this.position = position;
  }

  draw() {
    let x = Math.cos(this.position) * this.moveRadius + canvas.width / 2;
    let y = Math.sin(this.position) * this.moveRadius + canvas.height / 2;
    let size = this.moveRadius / 10;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.closePath();

    ctx.strokeStyle = 'white';
    ctx.stroke();
  }

  update() {
    this.position += this.step;
    this.draw();
  }
}

function init() {
  particleArray = [];
  const numberOfParticles = 100;

  for (let i = 0; i < numberOfParticles; i++) {
    // up to half the diagonal, so the orbits reach every corner and none run fully off-screen
    let moveRadius = (Math.random() * Math.hypot(canvas.width, canvas.height)) / 2;
    let step = Math.random() * 0.002 + 0.002;
    let position = Math.random() * Math.PI * 2;

    particleArray.push(new Particle(moveRadius, step, position));
  }
}

function animate() {
  requestAnimationFrame(animate);

  // background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  for (const particle of particleArray) {
    particle.update();
  }
}

init();
animate();

window.addEventListener('resize', function () {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  init();
});
