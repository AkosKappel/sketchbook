const WINNING_SCORE = 7;

let ball;
let leftPaddle;
let rightPaddle;
let scores = { left: 0, right: 0 };
let players = 1;
let aiAim = 0; // how far off center the AI aims, so it misses now and then
let state = 'ready'; // ready | running | paused | over

const stage = document.querySelector('.stage');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const modeSelect = document.getElementById('mode');
const outputs = {
  left: document.getElementById('left-score'),
  right: document.getElementById('right-score'),
};
const names = {
  left: document.getElementById('left-name'),
  right: document.getElementById('right-name'),
};

function setup() {
  const canvas = createCanvas(stage.clientWidth, stage.clientHeight);
  canvas.parent(stage);
  frameRate(60);

  newMatch();
  setupTouch(canvas.elt);
  overlay.addEventListener('pointerdown', handleAction);
  modeSelect.addEventListener('change', () => {
    players = Number(modeSelect.value);
    modeSelect.blur(); // so Space goes to the game, not the select
    newMatch();
    setState('ready');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'running') setState('paused');
  });
}

function newMatch() {
  scores = { left: 0, right: 0 };
  ball = new Ball();
  leftPaddle = new Paddle(SIDE.left, color(85, 140, 244));
  rightPaddle = new Paddle(SIDE.right, color(245, 185, 66));
  aiAim = 0;
  [names.left.textContent, names.right.textContent] = players === 1 ? ['You', 'CPU'] : ['Left', 'Right'];
  showScores();
}

function draw() {
  if (state === 'running') update();

  background(22, 27, 38);
  drawNet();
  leftPaddle.show();
  rightPaddle.show();
  ball.show();
}

function update() {
  // in 1 player mode both key sets move your paddle
  const arrows = players === 1;
  leftPaddle.update(keyIsDown(87) || (arrows && keyIsDown(UP_ARROW)), keyIsDown(83) || (arrows && keyIsDown(DOWN_ARROW)));
  if (players === 1) {
    updateAi();
  } else {
    rightPaddle.update(keyIsDown(UP_ARROW), keyIsDown(DOWN_ARROW));
  }

  ball.update();
  if (leftPaddle.checkCollision(ball)) aiAim = random(-0.75, 0.75) * rightPaddle.h;
  rightPaddle.checkCollision(ball);

  const missed = ball.missedSide;
  if (missed) {
    const scorer = missed === SIDE.left ? SIDE.right : SIDE.left;
    scores[scorer]++;
    showScores();
    if (scores[scorer] >= WINNING_SCORE) {
      setState('over');
    } else {
      ball.serve(missed === SIDE.left ? -1 : 1); // serve towards the player who missed
    }
  }
}

function updateAi() {
  // the AI only reacts once the ball heads its way and moves slower than the ball, so it can be beaten
  const incoming = ball.dir.x > 0 && ball.pos.x > width * 0.35;
  const target = incoming ? ball.pos.y + aiAim : height / 2;
  rightPaddle.moveTowards(target, min(rightPaddle.speed, ball.speed * 0.55));
}

function drawNet() {
  stroke(255, 255, 255, 28);
  strokeWeight(max(2, width * 0.003));
  const dash = max(10, height * 0.025);
  for (let y = dash / 2; y < height; y += dash * 2) {
    line(width / 2, y, width / 2, y + dash);
  }
}

function showScores() {
  outputs.left.value = scores.left;
  outputs.right.value = scores.right;
}

function winnerName() {
  if (players === 2) return scores.left > scores.right ? 'Left wins' : 'Right wins';
  return scores.left > scores.right ? 'You win!' : 'CPU wins';
}

function setState(next) {
  state = next;
  const messages = {
    ready: ['Pong', `First to ${WINNING_SCORE} wins. Press Space or tap to start`],
    paused: ['Paused', 'Press Space or tap to continue'],
    over: [winnerName(), `${scores.left} : ${scores.right}. Press Space or tap to play again`],
  };
  overlay.hidden = state === 'running';
  if (messages[state]) {
    [overlayTitle.textContent, overlayText.textContent] = messages[state];
  }
}

function handleAction() {
  if (state === 'running') {
    setState('paused');
    return;
  }
  if (state === 'over') newMatch();
  setState('running');
}

function keyPressed() {
  if (key === ' ') {
    handleAction();
    return false; // keep Space from scrolling the page
  }
  if ([UP_ARROW, DOWN_ARROW].includes(keyCode)) return false;
}

function setupTouch(canvasElement) {
  // each finger keeps the side it started on, so two players can share one screen; storing the side
  // instead of the paddle lets a finger held down across a new match steer the new match's paddle
  const dragging = new Map();
  const paddleOn = (side) => (side === SIDE.left ? leftPaddle : rightPaddle);
  canvasElement.addEventListener('pointerdown', (event) => {
    // in 1 player mode the whole court moves your paddle
    const side = players === 2 && event.offsetX > width / 2 ? SIDE.right : SIDE.left;
    dragging.set(event.pointerId, side);
    canvasElement.setPointerCapture(event.pointerId);
    paddleOn(side).target = event.offsetY;
  });
  canvasElement.addEventListener('pointermove', (event) => {
    const side = dragging.get(event.pointerId);
    if (side) paddleOn(side).target = event.offsetY;
  });
  const release = (event) => dragging.delete(event.pointerId);
  canvasElement.addEventListener('pointerup', release);
  canvasElement.addEventListener('pointercancel', release);
}

function windowResized() {
  const scaleX = stage.clientWidth / width;
  const scaleY = stage.clientHeight / height;
  resizeCanvas(stage.clientWidth, stage.clientHeight);

  ball.pos.x *= scaleX;
  ball.pos.y *= scaleY;
  for (const paddle of [leftPaddle, rightPaddle]) {
    paddle.target = null;
    paddle.move((scaleY - 1) * paddle.y); // scales the position and clamps it to the new court
  }
}
