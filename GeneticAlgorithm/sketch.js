const populationSize = 100;
const nBrainInstructions = 400;
const mutationRate = 0.01;

let population;
let goal;
let obstacles;

const speedInput = document.getElementById('speed');
const generationOutput = document.getElementById('generation');
const populationOutput = document.getElementById('population');
const bestOutput = document.getElementById('best');

function setup() {
  const canvas = createCanvas(850, 850).parent(document.querySelector('.stage'));
  fitCanvas(canvas.elt, 850, 850);

  goal = new Goal(width / 2, 20, 6);
  obstacles = [new Obstacle(0, 250, 600, 10), new Obstacle(width - 600, 500, 600, 10)];
  population = new Population(populationSize);
  populationOutput.value = populationSize;

  document.getElementById('restart').addEventListener('click', () => {
    population = new Population(populationSize);
  });
}

function draw() {
  // speed runs several simulation steps per frame but draws only once
  for (let i = 0; i < Number(speedInput.value); i++) {
    if (population.allDotsDone()) {
      population.evolve();
    } else {
      population.update();
    }
  }

  background(22, 27, 38);
  for (const obstacle of obstacles) obstacle.show();
  goal.show();
  population.show();

  generationOutput.value = population.generation;
  bestOutput.value = population.goalReached ? `${population.minStep} steps` : 'not reached yet';
}
