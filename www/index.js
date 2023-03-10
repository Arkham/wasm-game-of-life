import { Universe, Cell } from "wasm-game-of-life";
import { memory } from "wasm-game-of-life/wasm_game_of_life_bg";

const CELL_SIZE = 5; // px
const GRID_COLOR = "#CCCCCC";
const DEAD_COLOR = "#FFFFFF";
const ALIVE_COLORS = [
  "#e3eae0",
  "#c8d5c2",
  "#adc0a4",
  "#92ab86",
  "#779768",
  "#5f7853",
  "#475a3e",
  "#2f3c29"
];

let universe = Universe.new();
const width = universe.width();
const height = universe.height();

// canvas integration
const canvas = document.getElementById("game-of-life-canvas");
canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;

canvas.addEventListener("click", event => {
  const boundingRect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / boundingRect.width;
  const scaleY = canvas.height / boundingRect.height;

  const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
  const canvasTop = (event.clientY - boundingRect.top) * scaleY;

  const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
  const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);

  if (event.ctrlKey || event.metaKey) {
    universe.add_slider(row, col);
  } else if (event.shiftKey) {
    universe.add_pulsar(row, col);
  } else {
    universe.toggle_cell(row, col);
  }

  drawGrid();
  drawCells();
});

let ticksPerAnimation = 1;

// ticks per animation slider
const ticks = document.getElementById("ticks-per-turn");
const ticksLabel = document.querySelector("label[for='ticks-per-turn']");

ticks.addEventListener("input", event => {
  const value = parseInt(event.target.value, 10);
  ticksLabel.textContent = value;
  ticksPerAnimation = value;
});

const ctx = canvas.getContext('2d');

let animationId = null;
let animationCount = 0;

const renderLoop = () => {
  fps.render();

  if (++animationCount % (11 - ticksPerAnimation) == 0) {
    universe.tick();
    drawGrid();
    drawCells();
    animationCount = 0;
  }

  animationId = requestAnimationFrame(renderLoop);
};

// new universe and random universe
const newUniverse = document.getElementById("new-universe");
newUniverse.addEventListener("click", event => {
  universe = Universe.new();
  drawGrid();
  drawCells();
});

const randomUniverse = document.getElementById("random-universe");
randomUniverse.addEventListener("click", event => {
  universe = Universe.random_new();
  drawGrid();
  drawCells();
});

// draw grid and cells
const drawGrid = () => {
  ctx.beginPath();
  ctx.strokeStyle = GRID_COLOR;

  // vertical lines
  for (let i = 0; i <= width; i++) {
    ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
    ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
  }

  // horizontal lines
  for (let i = 0; i <= height; i++) {
    ctx.moveTo(0, i * (CELL_SIZE + 1) + 1);
    ctx.lineTo((CELL_SIZE + 1) * width + 1, i * (CELL_SIZE + 1) + 1);
  }

  ctx.stroke();
}

const getIndex = (row, col) => {
  return row * width + col;
};

const drawCells = () => {
  const cellsPtr = universe.cells();
  const cells = new Uint8Array(memory.buffer, cellsPtr, width * height);

  const agesPtr = universe.ages();
  const ages = new Uint8Array(memory.buffer, agesPtr, width * height);

  ctx.beginPath();

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = getIndex(row, col);

      ctx.fillStyle = cells[idx] === Cell.Dead
        ? DEAD_COLOR
        : ALIVE_COLORS[ages[idx] % 8];

      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  ctx.stroke()
};

// some interactivity
const isPaused = () => {
  return animationId === null;
}

const playPauseButton = document.getElementById("play-pause");

const play = () => {
  playPauseButton.textContent = "???";
  renderLoop();
};

const pause = () => {
  playPauseButton.textContent = "???";
  cancelAnimationFrame(animationId);
  animationId = null;
};

playPauseButton.addEventListener("click", event => {
  if (isPaused()) {
    play();
  } else {
    pause();
  }
});

// fps tracking
const fps = new class {
  constructor() {
    this.fps = document.getElementById("fps");
    this.frames = [];
    this.lastFrameTimeStamp = performance.now();
  }

  render() {
    // Convert the delta time since the last frame render into a measure
    // of frames per second.
    const now = performance.now();
    const delta = now - this.lastFrameTimeStamp;
    this.lastFrameTimeStamp = now;
    const fps = 1 / delta * 1000;

    // Save only the latest 100 timings.
    this.frames.push(fps);
    if (this.frames.length > 100) {
      this.frames.shift();
    }

    // Find the max, min, and mean of our 100 latest timings.
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (let i = 0; i < this.frames.length; i++) {
      sum += this.frames[i];
      min = Math.min(this.frames[i], min);
      max = Math.max(this.frames[i], max);
    }
    let mean = sum / this.frames.length;

    // Render the statistics.
    this.fps.textContent = `FPS: ${Math.round(fps)}`;
  }
};

// start the whole thing
play();
