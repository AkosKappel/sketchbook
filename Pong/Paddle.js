const SIDE = {
  left: 'left',
  right: 'right',
};

class Paddle {
  constructor(side, paddleColor) {
    this.side = side;
    this.color = paddleColor;
    this.y = height / 2; // center, so it scales cleanly on resize
    this.target = null; // y to move towards while dragging
  }

  get w() {
    return max(8, min(width, height) * 0.022);
  }

  get h() {
    return height * 0.2;
  }

  // left edge of the paddle, with some space behind it
  get x() {
    const offset = max(12, width * 0.03);
    return this.side === SIDE.left ? offset : width - offset - this.w;
  }

  get speed() {
    return height * 0.015;
  }

  show() {
    noStroke();
    fill(this.color);
    rect(this.x, this.y - this.h / 2, this.w, this.h, this.w / 2);
  }

  move(dy) {
    this.y = constrain(this.y + dy, this.h / 2, height - this.h / 2);
  }

  moveTowards(targetY, maxStep) {
    this.move(constrain(targetY - this.y, -maxStep, maxStep));
  }

  update(upPressed, downPressed) {
    if (upPressed || downPressed) {
      this.target = null;
      this.move(((downPressed ? 1 : 0) - (upPressed ? 1 : 0)) * this.speed);
    } else if (this.target !== null) {
      this.moveTowards(this.target, this.speed * 2);
    }
  }

  checkCollision(ball) {
    // only bounce while the ball moves towards this paddle, otherwise one hit counts over several frames
    const movingTowards = this.side === SIDE.left ? ball.dir.x < 0 : ball.dir.x > 0;
    const faceX = this.side === SIDE.left ? this.x + this.w : this.x;

    if (movingTowards && abs(ball.pos.x - faceX) < ball.r && abs(ball.pos.y - this.y) < this.h / 2 + ball.r) {
      ball.bounceOff(this);
      return true;
    }
    return false;
  }
}
