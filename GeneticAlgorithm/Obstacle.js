class Obstacle {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.color = color(0, 0, 255);
  }

  show() {
    fill(this.color);
    rect(this.x, this.y, this.w, this.h);
  }
}
