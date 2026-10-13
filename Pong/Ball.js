class Ball {
  constructor(radius = 25, speed = 10) {
    this.r = radius;
    this.initialSpeed = speed;
    this.speed = speed;
    this.resetAtCenter();
    this.lastSpeedUp = 0;
    this.color = color(255);
  }

  resetAtCenter() {
    this.speed = this.initialSpeed;
    this.pos = createVector(windowWidth / 2, windowHeight / 2);
    let randomAngle = random(-QUARTER_PI, QUARTER_PI) + random([0, PI]);
    this.vel = p5.Vector.fromAngle(randomAngle);
    this.vel.setMag(this.speed);
  }

  show() {
    fill(this.color);
    circle(this.pos.x, this.pos.y, 2 * this.r);
  }

  move() {
    this.pos.add(this.vel);
  }

  update() {
    this.move();
    this.keepWithinBounds();
    this.speedUp();
  }

  keepWithinBounds() {
    // left and right boundary
    if (this.pos.x - this.r < 0 || this.pos.x + this.r > windowWidth) {
      if (this.pos.x - this.r < 0) {
        stats.rightPlayerScore += stats.numBounces;
      } else {
        stats.leftPlayerScore += stats.numBounces;
      }
      stats.numBounces = 0;
      this.resetAtCenter();
    }
    // top and bottom boundary
    if (
      (this.pos.y - this.r < 0 && this.vel.y < 0) ||
      (this.pos.y + this.r > windowHeight && this.vel.y > 0)
    ) {
      this.vel.y *= -1;
    }
  }

  bounceOff(paddle) {
    stats.numBounces++;
    const maxBounceAngle = QUARTER_PI;

    let diff = abs(paddle.y - this.pos.y);

    let bounceAngle = map(
      diff,
      0,
      paddle.height,
      -maxBounceAngle,
      maxBounceAngle
    );
    if (paddle.side == SIDE.right) {
      bounceAngle += PI;
      bounceAngle *= -1;
    }

    this.vel = p5.Vector.fromAngle(bounceAngle);
    this.vel.setMag(this.speed);
  }

  speedUp() {
    if (millis() - this.lastSpeedUp > 5000) {
      this.speed *= 1.1;
      this.vel.setMag(this.speed);
      this.lastSpeedUp = millis();
    }
  }

  // returns the paddle which is expected to hit the ball next
  getNextPaddle() {
    // ball moves right
    if (this.vel.x > 0) {
      return rightPaddle;
    }
    // ball moves left
    if (this.vel.x < 0) {
      return leftPaddle;
    }
    return null;
  }
}
