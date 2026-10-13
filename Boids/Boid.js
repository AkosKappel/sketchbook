// Rules after Craig Reynolds' boids: http://www.red3d.com/cwr/boids/
class Boid {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.random2D().mult(random(2, 5));
    this.history = [];
  }

  update(flock) {
    this.flock(flock);
    this.avoidPointer();
    this.vel.limit(maxSpeed);
    this.keepWithinBounds();
    this.pos.add(this.vel);

    this.history.push([this.pos.x, this.pos.y]);
    if (this.history.length > trailLength) this.history.shift();
  }

  // cohesion, separation and alignment share one pass over the flock;
  // plain numbers instead of p5.Vector keep this O(n²) loop cheap
  flock(flock) {
    const visionSq = settings.vision ** 2;
    const minDistanceSq = minDistance ** 2;
    let centerX = 0;
    let centerY = 0;
    let velX = 0;
    let velY = 0;
    let awayX = 0;
    let awayY = 0;
    let neighbours = 0;

    for (const other of flock) {
      if (other === this) continue;
      const dx = this.pos.x - other.pos.x;
      const dy = this.pos.y - other.pos.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < visionSq) {
        centerX += other.pos.x;
        centerY += other.pos.y;
        velX += other.vel.x;
        velY += other.vel.y;
        neighbours++;
      }
      if (distSq < minDistanceSq) {
        awayX += dx;
        awayY += dy;
      }
    }

    if (neighbours > 0) {
      this.vel.x += (centerX / neighbours - this.pos.x) * settings.cohesion;
      this.vel.y += (centerY / neighbours - this.pos.y) * settings.cohesion;
      this.vel.x += (velX / neighbours - this.vel.x) * settings.alignment;
      this.vel.y += (velY / neighbours - this.vel.y) * settings.alignment;
    }
    this.vel.x += awayX * settings.separation;
    this.vel.y += awayY * settings.separation;
  }

  avoidPointer() {
    if (!pointer) return;
    const away = p5.Vector.sub(this.pos, pointer);
    const d = away.mag();
    if (d > 0 && d < pointerRange) {
      // the closer to the pointer, the harder the push
      this.vel.add(away.setMag((1 - d / pointerRange) * 2));
    }
  }

  keepWithinBounds() {
    const padding = min(200, width * 0.15, height * 0.15);
    const turn = 1;
    if (this.pos.x < padding) this.vel.x += turn;
    if (this.pos.y < padding) this.vel.y += turn;
    if (this.pos.x > width - padding) this.vel.x -= turn;
    if (this.pos.y > height - padding) this.vel.y -= turn;
  }

  traceTrail(ctx) {
    this.history.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());
    triangle(0, 0, -15, 5, -15, -5);
    pop();
  }
}
