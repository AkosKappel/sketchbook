var boids;
const visualRange = 75;
const drawTrail = false;
const numBoids = 100;
const drawTail = true;

/*
TODO:
draw tails for boids
draw shapes for boids (triangles)
optimize (quadtree / subdivision)
add user interface
boids with different visual range, speed, ...
set view not as a radius distance but only ahead of boids
add predator
add a strong wind

more ideas from CodingTrain: https://thecodingtrain.com/CodingChallenges/124-flocking-boids
CodingTrain source: https://github.com/CodingTrain/website/blob/main/CodingChallenges/CC_124_Flocking_Boids/P5/boid.js
wikipedia: https://en.wikipedia.org/wiki/Boids
Bean Eater: https://eater.net/boids
main documentation: http://www.red3d.com/cwr/boids/
pseudocode: http://www.kfish.org/boids/pseudocode.html
*/

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas-container');

  boids = [];
  for (let i = 0; i < numBoids; i++) {
    boids.push(new Boid());
  }
}

function draw() {
  background(14, 32, 56);

  for (const boid of boids) {
    boid.update();
    boid.show();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
