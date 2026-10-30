class Apple {
  constructor() {
    this.color = color(255, 92, 108);
    this.pos = createVector(0, 0);
    this.setRandomPosition();
  }

  show() {
    noStroke();
    fill(this.color);
    // a gentle pulse, about one beat a second
    const pulse = reducedMotion ? 1 : 1 + 0.08 * sin(millis() / 160);
    circle(this.pos.x + cellSize / 2, this.pos.y + cellSize / 2, cellSize * 0.7 * pulse);
  }

  setRandomPosition() {
    const free = [];
    for (let x = 0; x < cols(); x++) {
      for (let y = 0; y < rows(); y++) {
        if (!snake.occupies(x * cellSize, y * cellSize)) {
          free.push([x * cellSize, y * cellSize]);
        }
      }
    }
    if (free.length > 0) {
      this.pos.set(...random(free));
    }
  }
}
