const DIRECTION = {
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
};

const STEP = {
  [DIRECTION.up]: [0, -1],
  [DIRECTION.down]: [0, 1],
  [DIRECTION.left]: [-1, 0],
  [DIRECTION.right]: [1, 0],
};

class Snake {
  constructor(length = 4) {
    this.direction = random(Object.values(DIRECTION));
    this.nextDirection = this.direction;
    this.color = color(94, 230, 160);
    this.headColor = color(150, 245, 195);
    this.dead = false;

    // start in the middle cell, with the tail trailing behind the head
    const startX = floor(cols() / 2) * cellSize;
    const startY = floor(rows() / 2) * cellSize;
    const [dx, dy] = STEP[this.direction];
    this.body = [];
    for (let i = 0; i < length; i++) {
      this.body.push(createVector(startX - dx * i * cellSize, startY - dy * i * cellSize));
    }
    this.tail = this.body[this.body.length - 1].copy();
  }

  get score() {
    return this.body.length - 4;
  }

  show() {
    noStroke();
    for (let i = this.body.length - 1; i >= 0; i--) {
      fill(i === 0 ? this.headColor : this.color);
      rect(this.body[i].x + 1, this.body[i].y + 1, cellSize - 2, cellSize - 2, 6);
    }
  }

  move() {
    // apply the queued turn only now, so two quick key presses can't reverse the snake into itself
    this.direction = this.nextDirection;
    this.tail = this.body[this.body.length - 1].copy();

    for (let i = this.body.length - 1; i > 0; i--) {
      this.body[i].set(this.body[i - 1]);
    }

    const [dx, dy] = STEP[this.direction];
    this.body[0].add(dx * cellSize, dy * cellSize);
  }

  update() {
    if (this.dead) {
      return;
    }
    this.move();
    this.checkWalls();
    this.checkSelfCollision();
    if (!this.dead) {
      this.checkEatenApple();
    }
  }

  checkWalls() {
    const head = this.body[0];
    if (head.x < 0 || head.y < 0 || head.x >= cols() * cellSize || head.y >= rows() * cellSize) {
      this.dead = true;
    }
  }

  checkSelfCollision() {
    const head = this.body[0];
    this.dead ||= this.body.slice(1).some((part) => part.x === head.x && part.y === head.y);
  }

  checkEatenApple() {
    if (this.body[0].x === apple.pos.x && this.body[0].y === apple.pos.y) {
      this.body.push(this.tail);
      apple.setRandomPosition();
    }
  }

  occupies(x, y) {
    return this.body.some((part) => part.x === x && part.y === y);
  }

  turn(direction) {
    const [dx, dy] = STEP[direction];
    const [cx, cy] = STEP[this.direction];
    if (dx !== -cx || dy !== -cy) {
      this.nextDirection = direction;
    }
  }
}
