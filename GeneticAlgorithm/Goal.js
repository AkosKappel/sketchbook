class Goal {
  constructor(w, h, r) {
    this.pos = createVector(w, h);
    this.r = r;
    this.color = color(255, 0, 0);
  }

  show() {
    fill(this.color);
    ellipse(this.pos.x, this.pos.y, this.r, this.r);
  }
}
