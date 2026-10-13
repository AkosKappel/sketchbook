const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let width = 0;
let height = 0;

function randomColor(lightness) {
  return `hsl(${Math.random() * 360} 75% ${lightness}%)`;
}

function drawBranch(len, angle, branchWidth, branchColor, leafColor) {
  ctx.save();
  ctx.rotate((angle * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  const bend = len / 6;
  ctx.bezierCurveTo(bend, -len / 2, angle > 0 ? bend : -bend, -len / 2, 0, -len);
  ctx.strokeStyle = branchColor;
  ctx.lineWidth = branchWidth;
  ctx.stroke();

  if (len < 5) {
    ctx.beginPath();
    ctx.arc(0, -len, 8, 0, Math.PI / 2);
    ctx.fillStyle = leafColor;
    ctx.fill();
  } else {
    // Branch angles are relative to the parent, so draw children from the branch tip.
    ctx.translate(0, -len);
    const curve = Math.random() * 10 + 10;
    drawBranch(len * 0.75, angle + curve, branchWidth * 0.6, branchColor, leafColor);
    drawBranch(len * 0.75, angle - curve, branchWidth * 0.6, branchColor, leafColor);
  }
  ctx.restore();
}

function generateTree() {
  ctx.clearRect(0, 0, width, height);
  // The crown reaches about four trunk lengths up and two to each side, so this keeps it on screen.
  const trunk = Math.min(height * 0.21, width * 0.2) * (0.9 + Math.random() * 0.15);
  const branchWidth = trunk * (0.06 + Math.random() * 0.12);
  ctx.save();
  ctx.translate(width / 2, height - 8);
  drawBranch(trunk, 0, branchWidth, randomColor(55), randomColor(70));
  ctx.restore();
}

function resize(stageWidth, stageHeight) {
  width = stageWidth;
  height = stageHeight;
  generateTree();
}

document.getElementById('generate').addEventListener('click', generateTree);
fillStage(canvas, resize);
