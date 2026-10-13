class Ball {
  constructor() {
    this.color = color(232, 235, 242);
    this.serve(random([-1, 1]));
  }

  // sizes follow the canvas, so they stay right after a resize
  get r() {
    return max(6, min(width, height) * 0.02);
  }

  // capped so the ball can't skip past a paddle within one frame
  get speed() {
    return min(width * 0.007 * this.boost, this.r * 1.5);
  }

  serve(direction) {
    this.pos = createVector(width / 2, height / 2);
    this.boost = 1;
    this.dir = p5.Vector.fromAngle(random(-QUARTER_PI, QUARTER_PI) + (direction < 0 ? PI : 0));
    this.wait = 45; // frames before the ball moves, so players can get ready
  }

  show() {
    noStroke();
    fill(this.color);
    circle(this.pos.x, this.pos.y, 2 * this.r);
  }

  update() {
    if (this.wait > 0) {
      this.wait--;
      return;
    }
    this.pos.add(p5.Vector.mult(this.dir, this.speed));

    if ((this.pos.y - this.r < 0 && this.dir.y < 0) || (this.pos.y + this.r > height && this.dir.y > 0)) {
      this.dir.y *= -1;
    }
  }

  // the side the ball left the court on, or null while it is in play
  get missedSide() {
    if (this.pos.x - this.r < 0) return SIDE.left;
    if (this.pos.x + this.r > width) return SIDE.right;
    return null;
  }

  bounceOff(paddle) {
    // where the ball hits the paddle sets the angle: the edges send it off steeper
    const offset = constrain((this.pos.y - paddle.y) / (paddle.h / 2), -1, 1);
    let angle = offset * QUARTER_PI;
    if (paddle.side === SIDE.right) angle = PI - angle;

    this.dir = p5.Vector.fromAngle(angle);
    this.boost *= 1.06;
  }
}
