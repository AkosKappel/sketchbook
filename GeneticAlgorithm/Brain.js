class Brain {
  constructor(size) {
    this.directions = []; // one unit acceleration vector per step
    this.step = 0;
    for (let i = 0; i < size; i++) {
      this.directions.push(p5.Vector.random2D());
    }
  }

  clone() {
    const copy = new Brain(0);
    copy.directions = this.directions.map((direction) => direction.copy());
    return copy;
  }

  mutate() {
    for (let i = 0; i < this.directions.length; i++) {
      if (random() < mutationRate) {
        this.directions[i] = p5.Vector.random2D();
      }
    }
  }
}
