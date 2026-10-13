class Dot {
  constructor() {
    this.pos = createVector(width / 2, height - 20); // starting position of the dot
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);

    this.brain = new Brain(nBrainInstructions);
    this.color = color(0, 0, 0);
    this.colorBest = color(0, 255, 0);

    this.r = 4;
    this.fitness = 0;

    this.dead = false;
    this.reachedGoal = false;
    this.isBest = false; // true if this dot is the best dot from the previous generation
  }

  // draws the dot on the screen
  show() {
    if (this.isBest) {
      // the best dot from the previous generation is highlighted
      fill(this.colorBest);
      ellipse(this.pos.x, this.pos.y, 2 * this.r, 2 * this.r);
    } else {
      fill(this.color);
      ellipse(this.pos.x, this.pos.y, this.r, this.r);
    }
  }

  // moves the dot according to the brains directions
  move() {
    if (this.brain.directions.length > this.brain.step) {
      this.acc = this.brain.directions[this.brain.step];
      this.brain.step++;
    } else {
      // if at the end of the directions array then the dot is dead
      this.dead = true;
    }

    // apply the acceleration and move the dot
    this.vel.add(this.acc);
    this.vel.limit(5);
    this.pos.add(this.vel);
  }

  // calls the move() function and checks for collisions and stuff
  update() {
    if (!this.dead && !this.reachedGoal) {
      this.move();

      let canvasBorderSize = 2;
      let minGoalDistance = 5;
      if (
        this.pos.x < canvasBorderSize ||
        this.pos.y < canvasBorderSize ||
        this.pos.x > width - canvasBorderSize ||
        this.pos.y > height - canvasBorderSize
      ) {
        // dot has gone out of canvas
        this.dead = true;
      } else if (dist(this.pos.x, this.pos.y, goal.pos.x, goal.pos.y) < minGoalDistance) {
        // dot has reached the goal
        this.reachedGoal = true;
      } else {
        // dot has hit an obstacle
        for (const o of obstacles) {
          if (this.pos.x > o.x && this.pos.y > o.y && this.pos.x < o.x + o.w && this.pos.y < o.y + o.h) {
            this.dead = true;
            break;
          }
        }
      }
    }
  }

  // calculates the fitness
  calculateFitness() {
    let distanceToGoal = dist(this.pos.x, this.pos.y, goal.pos.x, goal.pos.y);
    this.fitness = 1.0 / distanceToGoal ** 2;

    if (this.reachedGoal) {
      this.fitness += 10_000.0 / this.brain.step ** 2;
    }
  }

  // makes a clone from the dot
  gimmeBaby() {
    let baby = new Dot();
    baby.brain = this.brain.clone(); // babies have the same brain as their parents
    return baby;
  }
}
