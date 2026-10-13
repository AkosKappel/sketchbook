class Boid {
  constructor() {
    this.pos = createVector(random(1) * width, random(1) * height);
    this.vel = p5.Vector.fromAngle(random(TWO_PI));
    this.vel.mult(random(5));
    this.history = [];
  }

  show() {
    this.drawBoid();
  }

  move() {
    this.pos.add(this.vel);
    this.history.push([this.pos.x, this.pos.y]);
    this.history = this.history.slice(-50);
  }

  update() {
    this.flyTowardsCenter();
    this.avoidOthers();
    this.matchVelocity();
    this.limitSpeed();
    this.keepWithinBounds();
    this.move();
  }

  keepWithinBounds() {
    const padding = min(200, width * 0.15, height * 0.15);
    const turnFactor = 1;

    if (this.pos.x < padding) {
      this.vel.x += turnFactor;
    }
    if (this.pos.y < padding) {
      this.vel.y += turnFactor;
    }
    if (this.pos.x > width - padding) {
      this.vel.x -= turnFactor;
    }
    if (this.pos.y > height - padding) {
      this.vel.y -= turnFactor;
    }
  }

  flyTowardsCenter() {
    const centeringFactor = 0.005; // adjust velocity by this %

    let center = createVector(0, 0);
    let numNeighbors = 0;

    for (const otherBoid of boids) {
      if (this.distance(otherBoid) < visualRange) {
        center.add(otherBoid.pos);
        numNeighbors++;
      }
    }

    if (numNeighbors > 1) {
      center.div(numNeighbors);
      center.sub(this.pos);
      center.mult(centeringFactor);
      this.vel.add(center);
    }
  }

  distance(boid) {
    return sqrt((this.pos.x - boid.pos.x) ** 2 + (this.pos.y - boid.pos.y) ** 2);
  }

  avoidOthers() {
    const minDistance = 20; // the distance to stay away from other boids
    const avoidFactor = 0.05; // adjust velocity by this %

    let move = createVector(0, 0);

    for (const otherBoid of boids) {
      if (this !== otherBoid) {
        if (this.distance(otherBoid) < minDistance) {
          let d = p5.Vector.sub(this.pos, otherBoid.pos);
          move.add(d);
        }
      }
    }

    move.mult(avoidFactor);
    this.vel.add(move);
  }

  matchVelocity() {
    const matchingFactor = 0.05; // adjust by this % of average velocity

    let avgVel = createVector(0, 0);
    let numNeighbors = 0;

    for (const otherBoid of boids) {
      if (this.distance(otherBoid) < visualRange) {
        avgVel.add(otherBoid.vel);
        numNeighbors++;
      }
    }

    if (numNeighbors > 1) {
      avgVel.div(numNeighbors);
      avgVel.sub(this.vel);
      avgVel.mult(matchingFactor);
      this.vel.add(avgVel);
    }
  }

  limitSpeed() {
    const speedLimit = 15;

    const speed = this.vel.mag();
    if (speed > speedLimit) {
      this.vel.div(speed);
      this.vel.mult(speedLimit);
    }
  }

  drawBoid() {
    if (drawTail) {
      stroke(85, 140, 244, 102);
      noFill();
      beginShape();
      for (const [x, y] of this.history) {
        vertex(x, y);
      }
      endShape();
    }

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());
    noStroke();
    fill(85, 140, 244);
    triangle(0, 0, -15, 5, -15, -5);
    pop();
  }
}
