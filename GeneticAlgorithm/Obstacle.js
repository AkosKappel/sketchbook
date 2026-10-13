class Obstacle {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  show() {
    noStroke();
    fill(85, 140, 244);
    rect(this.x, this.y, this.w, this.h, 3);
  }
}
