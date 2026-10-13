let canvas;
let speedSlider;
let test;
let goal;
let obstacles;

// parameters to tweak:
const populationSize = 100;
const nBrainInstructions = 400;
const mutationRate = 0.01;

// HTML dom:
let htmlPopul;
let htmlGen;
let htmlStep;

// TODO:
// set number of champions
// add text next to canvas
// add functionalities from python version

function setup() {
  canvas = createCanvas(850, 850);
  canvas.parent('canvas-holder');
  speedSlider = createSlider(1, 25, 1);
  speedSlider.parent('slider-holder');

  test = new Population(populationSize);
  goal = new Goal(width / 2, 20, 10);
  obstacles = [new Obstacle(0, 250, 600, 10), new Obstacle(width - 600, 500, 600, 10)];

  htmlPopul = document.getElementById('population-size');
  htmlPopul.innerHTML += ' ' + test.dots.length;
  htmlGen = document.getElementById('generation-count');
  htmlGen.innerHTML += ' ' + test.generation;
  htmlStep = document.getElementById('steps-count');
  htmlStep.innerHTML += ' ' + test.minStep;
}

function draw() {
  for (let iter = 0; iter < speedSlider.value(); iter++) {
    geneticAlgorithm();
  }

  // update stats on screen
  htmlGen.innerHTML = htmlGen.innerHTML.replace(/[0-9]+/g, test.generation);
  htmlStep.innerHTML = htmlStep.innerHTML.replace(/[0-9]+/g, test.minStep);
}

function geneticAlgorithm() {
  background(255);

  // draw goal
  goal.show();

  // draw obstacle(s)
  for (const o of obstacles) {
    o.show();
  }

  if (test.allDotsDead()) {
    // genetic algorithm
    test.calculateFitness();
    test.naturalSelection();
    test.mutateBabies();
  } else {
    // if any of the dots are still alive then update and then show them
    test.update();
    test.show();
  }
}

function inRange(num, min, max) {
  return num >= min && num <= max;
}
