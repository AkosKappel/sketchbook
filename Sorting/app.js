const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const algorithmSelect = document.getElementById('algorithm');
const sizeInput = document.getElementById('size');
const speedInput = document.getElementById('speed');
const sortButton = document.getElementById('sort');
const comparisonsOutput = document.getElementById('comparisons');
const writesOutput = document.getElementById('writes');
const hint = document.getElementById('hint');

const COLORS = { bar: '#3b4a66', compare: '#f5b942', write: '#ff7a90', done: '#5ee6a0' };

let width = 0;
let height = 0;
let values = [];
let marks = new Map(); // index -> color for the current step
let done = 0; // bars from the left that are drawn as finished
let stats = { comparisons: 0, writes: 0 };
let task = null;
let paused = false;
let frame = 0;

// Every algorithm is a generator that works on `values` through these helpers. Each helper counts the
// operation, marks the bars involved and yields, so the animation can show one step at a time.
function* compare(i, j) {
  stats.comparisons++;
  marks = new Map([
    [i, COLORS.compare],
    [j, COLORS.compare],
  ]);
  yield;
  return values[i] - values[j];
}

function* swap(i, j) {
  [values[i], values[j]] = [values[j], values[i]];
  stats.writes += 2;
  marks = new Map([
    [i, COLORS.write],
    [j, COLORS.write],
  ]);
  yield;
}

function* write(i, value) {
  values[i] = value;
  stats.writes++;
  marks = new Map([[i, COLORS.write]]);
  yield;
}

const ALGORITHMS = {
  bubble: {
    hint: 'Bubble sort, O(n²): swaps neighbours until the largest bubbles to the end',
    *sort() {
      for (let end = values.length - 1; end > 0; end--) {
        let swapped = false;
        for (let i = 0; i < end; i++) {
          if ((yield* compare(i, i + 1)) > 0) {
            yield* swap(i, i + 1);
            swapped = true;
          }
        }
        if (!swapped) return;
      }
    },
  },
  insertion: {
    hint: 'Insertion sort, O(n²): slides each item left into the sorted part',
    *sort() {
      for (let i = 1; i < values.length; i++) {
        for (let j = i; j > 0 && (yield* compare(j - 1, j)) > 0; j--) yield* swap(j - 1, j);
      }
    },
  },
  selection: {
    hint: 'Selection sort, O(n²): finds the smallest remaining item and puts it next',
    *sort() {
      for (let i = 0; i < values.length - 1; i++) {
        let min = i;
        for (let j = i + 1; j < values.length; j++) {
          if ((yield* compare(j, min)) < 0) min = j;
        }
        if (min !== i) yield* swap(i, min);
      }
    },
  },
  merge: {
    hint: 'Merge sort, O(n log n): sorts both halves, then merges them',
    *sort(lo = 0, hi = values.length - 1) {
      if (lo >= hi) return;
      const mid = Math.floor((lo + hi) / 2);
      yield* this.sort(lo, mid);
      yield* this.sort(mid + 1, hi);

      const left = values.slice(lo, mid + 1);
      const right = values.slice(mid + 1, hi + 1);
      let i = 0;
      let j = 0;
      for (let k = lo; k <= hi; k++) {
        const takeLeft = j >= right.length || (i < left.length && left[i] <= right[j]);
        if (i < left.length && j < right.length) stats.comparisons++;
        yield* write(k, takeLeft ? left[i++] : right[j++]);
      }
    },
  },
  quick: {
    hint: 'Quicksort, O(n log n) on average: splits around a pivot, then sorts each side',
    *sort(lo = 0, hi = values.length - 1) {
      if (lo >= hi) return;
      // Lomuto partition with the last item as the pivot
      let store = lo;
      for (let i = lo; i < hi; i++) {
        if ((yield* compare(i, hi)) < 0) {
          if (i !== store) yield* swap(i, store);
          store++;
        }
      }
      if (store !== hi) yield* swap(store, hi);
      yield* this.sort(lo, store - 1);
      yield* this.sort(store + 1, hi);
    },
  },
  heap: {
    hint: 'Heapsort, O(n log n): builds a max-heap, then moves its top to the end',
    *sort() {
      const n = values.length;
      for (let i = Math.floor(n / 2) - 1; i >= 0; i--) yield* this.siftDown(i, n);
      for (let end = n - 1; end > 0; end--) {
        yield* swap(0, end);
        yield* this.siftDown(0, end);
      }
    },
    *siftDown(i, size) {
      for (;;) {
        let largest = i;
        const left = 2 * i + 1;
        const right = left + 1;
        if (left < size && (yield* compare(left, largest)) > 0) largest = left;
        if (right < size && (yield* compare(right, largest)) > 0) largest = right;
        if (largest === i) return;
        yield* swap(i, largest);
        i = largest;
      }
    },
  },
};

function* run(algorithm) {
  yield* algorithm.sort();
  marks = new Map();
  // a quick sweep from left to right marks the finished array
  for (done = 1; done <= values.length; done++) yield;
  sortButton.textContent = 'Sort';
}

function shuffle() {
  task = null;
  const n = Number(sizeInput.value);
  values = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  marks = new Map();
  done = 0;
  stats = { comparisons: 0, writes: 0 };
  sortButton.textContent = 'Sort';
}

function toggleSort() {
  if (task) {
    paused = !paused;
  } else {
    if (done) shuffle();
    task = run(ALGORITHMS[algorithmSelect.value]);
    paused = false;
  }
  sortButton.textContent = paused ? 'Resume' : 'Pause';
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  const gap = values.length > 100 ? 1 : 2;
  const barWidth = (width - 32) / values.length;
  for (let i = 0; i < values.length; i++) {
    const barHeight = (values[i] / values.length) * (height - 32);
    ctx.fillStyle = i < done ? COLORS.done : (marks.get(i) ?? COLORS.bar);
    ctx.fillRect(16 + i * barWidth, height - 16 - barHeight, Math.max(1, barWidth - gap), barHeight);
  }
  comparisonsOutput.value = stats.comparisons;
  writesOutput.value = stats.writes;
}

function animate() {
  if (task && !paused) {
    // the slowest speed is one step every 8 frames, then each level doubles up to 32 steps per frame
    const level = Number(speedInput.value) - 3;
    frame++;
    const steps = level >= 0 ? 2 ** level : Number(frame % 2 ** -level === 0);
    for (let i = 0; task && i < steps; i++) {
      if (task.next().done) task = null;
    }
  }
  draw();
  requestAnimationFrame(animate);
}

function showHint() {
  hint.textContent = ALGORITHMS[algorithmSelect.value].hint;
}

sortButton.addEventListener('click', toggleSort);
document.getElementById('shuffle').addEventListener('click', shuffle);
sizeInput.addEventListener('change', shuffle);
algorithmSelect.addEventListener('change', () => {
  showHint();
  shuffle();
});

fillStage(canvas, (stageWidth, stageHeight) => {
  width = stageWidth;
  height = stageHeight;
});
showHint();
shuffle();
requestAnimationFrame(animate);
