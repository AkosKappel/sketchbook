class Goal {
  constructor(x, y, r) {
    this.pos = createVector(x, y);
    this.r = r;
  }

  show() {
    noStroke();
    fill(255, 92, 108, 50);
    circle(this.pos.x, this.pos.y, this.r * 4);
    fill(255, 92, 108);
    circle(this.pos.x, this.pos.y, this.r * 2);
  }
}
