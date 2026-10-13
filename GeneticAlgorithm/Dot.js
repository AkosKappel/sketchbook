class Dot {
  constructor() {
    this.pos = createVector(width / 2, height - 20);
    this.vel = createVector(0, 0);
    this.brain = new Brain(nBrainInstructions);
    this.fitness = 0;
    this.dead = false;
    this.reachedGoal = false;
    this.isBest = false; // the unmutated champion of the previous generation
  }

  show() {
    noStroke();
    if (this.isBest) {
      fill(245, 185, 66);
      circle(this.pos.x, this.pos.y, 14);
    } else {
      fill(232, 235, 242, 170);
      circle(this.pos.x, this.pos.y, 8);
    }
  }

  move() {
    if (this.brain.step >= this.brain.directions.length) {
      this.dead = true;
      return;
    }
    this.vel.add(this.brain.directions[this.brain.step]);
    this.vel.limit(5);
    this.pos.add(this.vel);
    this.brain.step++;
  }

  update() {
    if (this.dead || this.reachedGoal) return;
    this.move();

    const border = 2;
    if (this.pos.x < border || this.pos.y < border || this.pos.x > width - border || this.pos.y > height - border) {
      this.dead = true;
    } else if (this.pos.dist(goal.pos) < goal.r) {
      this.reachedGoal = true;
    } else if (obstacles.some((o) => this.pos.x > o.x && this.pos.y > o.y && this.pos.x < o.x + o.w && this.pos.y < o.y + o.h)) {
      this.dead = true;
    }
  }

  calculateFitness() {
    if (this.reachedGoal) {
      // any dot at the goal beats every dot that missed it, and fewer steps is better
      this.fitness = 1 / 16 + 10_000 / this.brain.step ** 2;
    } else {
      this.fitness = 1 / this.pos.dist(goal.pos) ** 2;
    }
  }

  clone() {
    const child = new Dot();
    child.brain = this.brain.clone();
    return child;
  }
}
