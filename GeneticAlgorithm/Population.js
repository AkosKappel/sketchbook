class Population {
  constructor(size) {
    this.dots = Array.from({ length: size }, () => new Dot());
    this.generation = 1;
    this.minStep = nBrainInstructions;
    this.goalReached = false;
  }

  show() {
    // draw the champion last so it stays on top
    for (let i = this.dots.length - 1; i >= 0; i--) {
      this.dots[i].show();
    }
  }

  update() {
    for (const dot of this.dots) {
      // once the goal has been reached, slower dots cannot win, so stop them early
      if (dot.brain.step > this.minStep) {
        dot.dead = true;
      } else {
        dot.update();
      }
    }
  }

  allDotsDone() {
    return this.dots.every((dot) => dot.dead || dot.reachedGoal);
  }

  evolve() {
    for (const dot of this.dots) dot.calculateFitness();
    const best = this.dots.reduce((a, b) => (b.fitness > a.fitness ? b : a));
    if (best.reachedGoal) {
      this.minStep = best.brain.step;
      this.goalReached = true;
    }

    const fitnessSum = this.dots.reduce((sum, dot) => sum + dot.fitness, 0);
    const champion = best.clone();
    champion.isBest = true;
    const children = [champion];
    while (children.length < this.dots.length) {
      const child = this.selectParent(fitnessSum).clone();
      child.brain.mutate();
      children.push(child);
    }

    this.dots = children;
    this.generation++;
  }

  // roulette wheel selection: the chance to be picked is proportional to fitness
  selectParent(fitnessSum) {
    const threshold = random(fitnessSum);
    let runningSum = 0;
    for (const dot of this.dots) {
      runningSum += dot.fitness;
      if (runningSum > threshold) return dot;
    }
    return this.dots[this.dots.length - 1]; // only reachable through floating point rounding
  }
}
