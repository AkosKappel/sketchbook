class Snake {
  constructor(length = 4) {
    this.direction = DIRECTION[Object.keys(DIRECTION)[floor(random() * Object.keys(DIRECTION).length)]];
    this.color = color(82, 217, 69);
    this.body = [createVector(width / 2, height / 2)];
    length = min(length, width / cellWidth / 2, height / cellHeight / 2);
    this.createTail(length);
    this.tail = this.body[length - 1];
    this.nextDirection = this.direction;
    this.dead = false;
  }

  createTail(length) {
    for (let i = 1; i < length; i++) {
      let tail = null;

      if (this.direction === DIRECTION.up) {
        tail = createVector(width / 2, height / 2 + i * cellHeight);
      } else if (this.direction === DIRECTION.down) {
        tail = createVector(width / 2, height / 2 - i * cellHeight);
      } else if (this.direction === DIRECTION.left) {
        tail = createVector(width / 2 + i * cellWidth, height / 2);
      } else if (this.direction === DIRECTION.right) {
        tail = createVector(width / 2 - i * cellWidth, height / 2);
      }
      this.body.push(tail);
    }
  }

  show() {
    fill(this.color);
    for (let i = 0; i < this.body.length; i++) {
      rect(this.body[i].x, this.body[i].y, cellWidth, cellHeight);
    }
  }

  move() {
    // apply the queued turn only now, so two quick key presses can't reverse the snake into itself
    this.direction = this.nextDirection;

    // update tail position
    const last = this.body.length - 1;
    this.tail = createVector(this.body[last].x, this.body[last].y);

    // move the tail
    for (let i = this.body.length - 1; i > 0; i--) {
      this.body[i].x = this.body[i - 1].x;
      this.body[i].y = this.body[i - 1].y;
    }

    // move the head
    if (this.direction === DIRECTION.up) {
      this.body[0].y -= cellHeight;
    } else if (this.direction === DIRECTION.down) {
      this.body[0].y += cellHeight;
    } else if (this.direction === DIRECTION.left) {
      this.body[0].x -= cellWidth;
    } else if (this.direction === DIRECTION.right) {
      this.body[0].x += cellWidth;
    }
  }

  update() {
    if (!this.dead) {
      this.move();
      this.keepWithinBounds();
      this.checkSelfCollision();
      this.checkEatenApple();
    }
  }

  // kills the snake if it leaves the board
  keepWithinBounds() {
    if (
      (this.body[0].x < 0 && this.direction === DIRECTION.left) ||
      (this.body[0].y < 0 && this.direction === DIRECTION.up) ||
      (this.body[0].x + cellWidth > width && this.direction === DIRECTION.right) ||
      (this.body[0].y + cellHeight > height && this.direction === DIRECTION.down)
    ) {
      this.dead = true;
    }
  }

  checkSelfCollision() {
    for (let i = 1; i < this.body.length; i++) {
      if (this.body[0].x === this.body[i].x && this.body[0].y === this.body[i].y) {
        this.dead = true;
        return;
      }
    }
  }

  checkEatenApple() {
    if (this.body[0].x === apple.pos.x && this.body[0].y === apple.pos.y) {
      this.body.push(this.tail);
      apple.setRandomPosition();
    }
  }
}

const DIRECTION = {
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
};

