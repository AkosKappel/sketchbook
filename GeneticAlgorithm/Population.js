class Population {
  constructor(size) {
    this.dots = [];
    for (let i = 0; i < size; i++) {
      this.dots.push(new Dot());
    }
    this.fitnessSum = 0;
    this.generation = 1;
    this.bestDotIndex = 0;
    this.minStep = this.dots[0].brain.directions.length;
  }

  // show all dots
  show() {
    for (let i = 1; i < this.dots.length; i++) {
      this.dots[i].show();
    }
    this.dots[0].show(); // highlight the best from the previous generation
  }

  // update all dots
  update() {
    for (let i = 0; i < this.dots.length; i++) {
      if (this.dots[i].brain.step > this.minStep) {
        this.dots[i].dead = true;
      } else {
        this.dots[i].update();
      }
    }
  }

  // calculate all the fitnesses
  calculateFitness() {
    for (let i = 0; i < this.dots.length; i++) {
      this.dots[i].calculateFitness();
    }
  }

  // returns whether all the dots are either dead or have reached the goal
  allDotsDead() {
    for (let i = 0; i < this.dots.length; i++) {
      if (!this.dots[i].dead && !this.dots[i].reachedGoal) {
        return false;
      }
    }
    return true;
  }

  // gets the next generation of dots
  naturalSelection() {
    let newDots = [];
    this.setBestDot();
    this.calculateFitnessSum();

    // the champion lives on
    newDots.push(this.dots[this.bestDotIndex].gimmeBaby());
    newDots[0].isBest = true;

    for (let i = 1; i < this.dots.length; i++) {
      // select parent based on fitness
      let parent = this.selectParent();

      // get baby from them
      let baby = parent.gimmeBaby();
      newDots.push(baby);
    }

    this.dots = newDots;
    this.generation++;
  }

  calculateFitnessSum() {
    this.fitnessSum = 0;
    for (let i = 0; i < this.dots.length; i++) {
      this.fitnessSum += this.dots[i].fitness;
    }
  }

  // returns a random dot from the population based on fitness
  selectParent() {
    let treshold = random(this.fitnessSum);
    let runningSum = 0;

    for (let i = 0; i < this.dots.length; i++) {
      runningSum += this.dots[i].fitness;
      if (runningSum > treshold) {
        return this.dots[i];
      }
    }

    alert('Error: selected parent is null.');
    return null; // should never get to this point
  }

  // mutates all the brains of the dots
  mutateBabies() {
    for (let i = 1; i < this.dots.length; i++) {
      this.dots[i].brain.mutate();
    }
  }

  // finds the dot with the highest fitness and sets it as the best dot
  setBestDot() {
    let maxFitness = 0;
    let maxIndex = 0;
    for (let i = 0; i < this.dots.length; i++) {
      if (this.dots[i].fitness > maxFitness) {
        maxFitness = this.dots[i].fitness;
        maxIndex = i;
      }
    }

    this.bestDotIndex = maxIndex;

    // if the best dot reached the goal then reset the minimum number of steps it takes to get to the goal
    if (this.dots[this.bestDotIndex].reachedGoal) {
      this.minStep = this.dots[this.bestDotIndex].brain.step;
    }
  }
}
