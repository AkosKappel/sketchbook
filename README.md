# SketchBook

A collection of small browser experiments: classic games, simulations, fractals and canvas effects. Most were written while learning web development by following tutorials, then cleaned up, fixed and redesigned in 2026. Minesweeper, Maze, Sorting, Mandelbrot and Flow Field were added in 2026.

Live: https://akoskappel.github.io/sketchbook/

| Category | Projects |
| --- | --- |
| Games | Snake, Pong, Tic Tac Toe, Minesweeper |
| Simulations and algorithms | Game of Life, Boids, Genetic Algorithm, QuadTree, Maze, Sorting |
| Math and fractals | Chaos Game, Barnsley Fern, Fourier Series, Fractal Trees, Mandelbrot |
| Effects | Particle Network, Animated Clouds, Spinning Stars, Particle Rain, Interactive Particles, Flow Field |

## Stack

Plain HTML, CSS and JavaScript with no build step. The p5.js projects use a vendored copy of [p5.js](https://p5js.org/) 1.11 in `lib/`; the rest use the Canvas 2D API or plain DOM elements directly.

## Structure

```
index.html          landing page
projects.js         project and category list the landing page is rendered from
collection.js       renders the filters and project cards
shared/             base stylesheet, canvas sizing and image input helpers, favicon
lib/p5.min.js       p5.js 1.11.13
thumbs/             landing page previews
<Project>/          one folder per project, opened via <Project>/index.html
```

## Run locally

The pages must be served over HTTP (the image based effects read pixel data, which browsers block on `file://`):

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/.

## Deployment

GitHub Pages serves the repository root from the `main` branch. `.nojekyll` turns off Jekyll processing.

## Credits

Several projects follow tutorials by [The Coding Train](https://thecodingtrain.com/) (QuadTree, Fourier Series, Boids) and [Frank's Laboratory](https://www.youtube.com/@Frankslaboratory) (the canvas particle effects).
