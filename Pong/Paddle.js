class Paddle {
  constructor(side) {
    this.side = SIDE[side];
    this.width = 20;
    this.height = 220;
    this.offset = 40; // space behind the paddle
    this.r = 20; // corner radius
    this.speed = 10;
    this.color = side === SIDE.left ? 'lightblue' : 'orange';

    if (side === SIDE.left) {
      this.x = this.offset;
    } else if (side === SIDE.right) {
      this.x = windowWidth - this.offset - this.width;
    } else {
      alert('Error: invalid paddle side.');
      this.x = 0;
    }
    this.y = (windowHeight - this.height) / 2;
  }

  show() {
    fill(this.color);
    rect(this.x, this.y, this.width, this.height, this.r);
  }

  moveUp() {
    if (this.y > 0) {
      this.y -= this.speed;
    }
  }

  moveDown() {
    if (this.y + this.height < windowHeight) {
      this.y += this.speed;
    }
  }

  update() {
    if (this.side === SIDE.right) {
      if (keyIsDown(UP_ARROW)) {
        rightPaddle.moveUp();
      }
      if (keyIsDown(DOWN_ARROW)) {
        rightPaddle.moveDown();
      }
    } else if (this.side === SIDE.left) {
      if (keyIsDown(87)) {
        leftPaddle.moveUp(); // w
      }
      if (keyIsDown(83)) {
        leftPaddle.moveDown(); // s
      }
    }

    this.checkCollision();
  }

  checkCollision() {
    if (this.side === SIDE.left) {
      if (
        ball.pos.x > this.x + this.width - ball.r &&
        ball.pos.x < this.x + this.width + ball.r &&
        ball.pos.y > this.y &&
        ball.pos.y < this.y + this.height
      ) {
        ball.bounceOff(this);
      }
    } else if (this.side === SIDE.right) {
      if (
        ball.pos.x > this.x - ball.r &&
        ball.pos.x < this.x + ball.r &&
        ball.pos.y > this.y &&
        ball.pos.y < this.y + this.height
      ) {
        ball.bounceOff(this);
      }
    }
  }

  // moves the paddles to the correct positions when the window is resized
  fixOffset() {
    if (this.side === SIDE.left) {
      this.x = this.offset;
    } else if (this.side === SIDE.right) {
      this.x = windowWidth - this.offset - this.width;
    }
  }
}

const SIDE = {
  left: 'left',
  right: 'right',
};
