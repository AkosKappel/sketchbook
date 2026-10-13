class Apple {
  constructor() {
    this.color = color(255, 79, 79);
    this.pos = createVector(0, 0);
    this.setRandomPosition();
  }

  show() {
    fill(this.color);
    rect(this.pos.x, this.pos.y, cellWidth, cellHeight);
  }

  setRandomPosition() {
    const w = width / cellWidth;
    const h = height / cellHeight;

    let isEmptyCell = false;
    while (!isEmptyCell) {
      let x = floor(random() * w); // integer in range <0; w)
      let y = floor(random() * h); // integer in range <0; h)

      x *= cellWidth;
      y *= cellHeight;

      isEmptyCell = true;

      for (let i = 0; i < snake.body.length; i++) {
        if (snake.body[i].x === x && snake.body[i].y === y) {
          isEmptyCell = false;
          break;
        }
      }

      if (isEmptyCell) {
        this.pos.x = x;
        this.pos.y = y;
      }
    }
  }
}
