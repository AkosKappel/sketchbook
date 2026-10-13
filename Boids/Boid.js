class Boid {
  constructor() {
    this.pos = createVector(random(1) * width, random(1) * height);
    this.vel = p5.Vector.fromAngle(random(TWO_PI));
    this.vel.mult(random(5));
    this.color = color(137, 207, 240);
    this.history = [];
  }

  show() {
    // this.drawDot();
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
    // this.keepOnInfinitePlane();
    this.move();
  }

  keepWithinBounds() {
    const padding = 200;
    const turnFactor = 1;

    if (this.pos.x < padding) {
      this.vel.x += turnFactor;
    }
    if (this.pos.y < padding) {
      this.vel.y += turnFactor;
    }
    if (this.pos.x > windowWidth - padding) {
      this.vel.x -= turnFactor;
    }
    if (this.pos.y > windowHeight - padding) {
      this.vel.y -= turnFactor;
    }
  }

  // keeps the boids on the surface of a torus
  keepOnInfinitePlane() {
    if (this.pos.x < 0) {
      this.pos.x = windowWidth;
      this.history = [];
    }
    if (this.pos.y < 0) {
      this.pos.y = windowHeight;
      this.history = [];
    }
    if (this.pos.x > windowWidth) {
      this.pos.x = 0;
      this.history = [];
    }
    if (this.pos.y > windowHeight) {
      this.pos.y = 0;
      this.history = [];
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

  drawDot() {
    stroke(this.color);
    strokeWeight(10);
    point(this.pos.x, this.pos.y);
  }

  drawBoid() {
    const ctx = document.getElementById('defaultCanvas0').getContext('2d');
    const angle = atan2(this.vel.y, this.vel.x);

    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(angle);
    ctx.translate(-this.pos.x, -this.pos.y);
    ctx.fillStyle = '#558cf4';
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(this.pos.x - 15, this.pos.y + 5);
    ctx.lineTo(this.pos.x - 15, this.pos.y - 5);
    ctx.lineTo(this.pos.x, this.pos.y);
    ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (drawTail) {
      ctx.strokeStyle = '#558cf466';
      ctx.beginPath();
      ctx.moveTo(this.history[0][0], this.history[0][1]);
      for (const p of this.history) {
        ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    }
  }
}
