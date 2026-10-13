const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
const generateButton = document.querySelector('.generate-tree-button');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let curve = 10;

function drawTree(startX, startY, len, angle, branchWidth, color1, color2) {
  ctx.beginPath();
  ctx.save();
  ctx.strokeStyle = color1;
  ctx.fillStyle = color2;
  ctx.shadowBlur = 5;
  ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = branchWidth;
  ctx.translate(startX, startY);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.moveTo(0, 0);
  // ctx.lineTo(0, -len);
  if (angle > 0) {
    ctx.bezierCurveTo(20, -len / 2, 20, -len / 2, 0, -len);
  } else {
    ctx.bezierCurveTo(20, -len / 2, -20, -len / 2, 0, -len);
  }
  ctx.stroke();

  if (len < 5) {
    // leafs
    ctx.beginPath();
    ctx.arc(0, -len, 10, 0, Math.PI / 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  curve = Math.random() * 10 + 10;

  drawTree(0, -len, len * 0.75, angle + curve, branchWidth * 0.6, color1, color2);
  drawTree(0, -len, len * 0.75, angle - curve, branchWidth * 0.6, color1, color2);

  ctx.restore();
}

drawTree(canvas.width / 2, canvas.height - 80, 120, 0, 15, 'brown', 'pink');

function generateRandomTree() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let centerPointX = canvas.width / 2;
  let centerPointY = canvas.height - 80;
  let len = Math.floor(Math.random() * 20) + 100;
  let angle = 0;
  let branchWidth = Math.random() * 70 + 1;
  let color1 = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`;
  let color2 = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`;

  generateButton.style.background = color1;

  drawTree(centerPointX, centerPointY, len, angle, branchWidth, color1, color2);
}

generateButton.addEventListener('click', generateRandomTree);

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  generateRandomTree();
});
