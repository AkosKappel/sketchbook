class Brain {
  constructor(size) {
    this.directions = []; //series of vectors which get the dot to the goal
    this.step = 0;
    this.randomize(size);
  }

  // sets all the vectors in directions to a random vector with length 1
  randomize(length) {
    for (let i = 0; i < length; i++) {
      let angle = random(TWO_PI);
      this.directions.push(p5.Vector.fromAngle(angle));
    }
  }

  // returns a perfect copy of this brain object
  clone() {
    let newBrain = new Brain(this.directions.length);
    for (let i = 0; i < this.directions.length; i++) {
      newBrain.directions[i] = this.directions[i].copy();
    }
    return newBrain;
  }

  // mutates the brain by setting some of the directions to random vectors
  mutate() {
    for (let i = 0; i < this.directions.length; i++) {
      let rand = random(1);
      if (rand < mutationRate) {
        // chance that any vector in directions gets set as a random direction
        let angle = random(TWO_PI);
        this.directions[i] = p5.Vector.fromAngle(angle);
      }
    }
  }
}
