const TICK_MS = 180;
const GRID_SIZE = 20;

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function sameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

function isOppositeDirection(a, b) {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

function placeFood(snake, gridSize, randomFn = Math.random) {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const available = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) available.push({ x, y });
    }
  }

  if (available.length === 0) return null;
  return available[Math.floor(randomFn() * available.length)];
}

function createInitialState(gridSize = GRID_SIZE, randomFn = Math.random) {
  const center = Math.floor(gridSize / 2);
  const snake = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];

  return {
    gridSize,
    snake,
    direction: "right",
    nextDirection: "right",
    food: placeFood(snake, gridSize, randomFn),
    score: 0,
    status: "running",
  };
}

function setDirection(state, requestedDirection) {
  if (state.status !== "running") return state;
  if (!DIRS[requestedDirection]) return state;
  if (
    isOppositeDirection(state.direction, requestedDirection) ||
    isOppositeDirection(state.nextDirection, requestedDirection)
  ) {
    return state;
  }

  return { ...state, nextDirection: requestedDirection };
}

function togglePause(state) {
  if (state.status === "game-over") return state;
  return { ...state, status: state.status === "paused" ? "running" : "paused" };
}

function restart(state, randomFn = Math.random) {
  return createInitialState(state.gridSize, randomFn);
}

function tick(state, randomFn = Math.random) {
  if (state.status !== "running") return state;

  const move = DIRS[state.nextDirection];
  const head = state.snake[0];
  const newHead = { x: head.x + move.x, y: head.y + move.y };
  const outOfBounds =
    newHead.x < 0 ||
    newHead.y < 0 ||
    newHead.x >= state.gridSize ||
    newHead.y >= state.gridSize;
  if (outOfBounds) return { ...state, status: "game-over" };

  const ateFood = state.food && sameCell(newHead, state.food);
  const bodyToCheck = ateFood ? state.snake : state.snake.slice(0, -1);
  const hitSelf = bodyToCheck.some((segment) => sameCell(segment, newHead));
  if (hitSelf) return { ...state, status: "game-over" };

  const nextSnake = [newHead, ...state.snake];
  if (!ateFood) nextSnake.pop();
  const nextFood = ateFood ? placeFood(nextSnake, state.gridSize, randomFn) : state.food;

  return {
    ...state,
    snake: nextSnake,
    direction: state.nextDirection,
    nextDirection: state.nextDirection,
    food: nextFood,
    score: ateFood ? state.score + 1 : state.score,
    status: nextFood ? state.status : "game-over",
  };
}

const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status-text");
const restartBtn = document.getElementById("restart-btn");
const pauseBtn = document.getElementById("pause-btn");
const touchButtons = document.querySelectorAll("[data-dir]");

let state = createInitialState(GRID_SIZE);
let timerId = null;
const cells = [];
let touchStart = null;

function keyForPoint(point) {
  return `${point.x},${point.y}`;
}

function buildBoard() {
  const fragment = document.createDocumentFragment();
  for (let y = 0; y < state.gridSize; y += 1) {
    for (let x = 0; x < state.gridSize; x += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.key = `${x},${y}`;
      cells.push(cell);
      fragment.appendChild(cell);
    }
  }
  boardEl.appendChild(fragment);
}

function render() {
  const snakeSet = new Set(state.snake.map(keyForPoint));
  const foodKey = state.food ? keyForPoint(state.food) : null;

  for (const cell of cells) {
    cell.classList.remove("snake", "food");
    const key = cell.dataset.key;
    if (snakeSet.has(key)) cell.classList.add("snake");
    if (foodKey && key === foodKey) cell.classList.add("food");
  }

  scoreEl.textContent = String(state.score);

  if (state.status === "game-over") {
    statusEl.textContent = "Game over. Press Restart to play again.";
    pauseBtn.textContent = "Pause";
  } else if (state.status === "paused") {
    statusEl.textContent = "Paused.";
    pauseBtn.textContent = "Resume";
  } else {
    statusEl.textContent = "Use arrow keys/WASD or swipe/tap controls.";
    pauseBtn.textContent = "Pause";
  }
}

function gameTick() {
  state = tick(state);
  if (state.status === "game-over") stopLoop();
  render();
}

function startLoop() {
  if (timerId !== null) return;
  timerId = window.setInterval(gameTick, TICK_MS);
}

function stopLoop() {
  if (timerId === null) return;
  window.clearInterval(timerId);
  timerId = null;
}

function mapKeyToDirection(key) {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up";
    case "ArrowDown":
    case "s":
    case "S":
      return "down";
    case "ArrowLeft":
    case "a":
    case "A":
      return "left";
    case "ArrowRight":
    case "d":
    case "D":
      return "right";
    default:
      return null;
  }
}

function handleDirectionInput(direction) {
  state = setDirection(state, direction);
}

window.addEventListener("keydown", (event) => {
  if (event.key === " ") {
    event.preventDefault();
    state = togglePause(state);
    if (state.status === "paused") stopLoop();
    if (state.status === "running") startLoop();
    render();
    return;
  }

  const direction = mapKeyToDirection(event.key);
  if (!direction) return;

  event.preventDefault();
  handleDirectionInput(direction);
});

pauseBtn.addEventListener("click", () => {
  state = togglePause(state);
  if (state.status === "paused") stopLoop();
  if (state.status === "running") startLoop();
  render();
});

restartBtn.addEventListener("click", () => {
  state = restart(state);
  startLoop();
  render();
});

for (const button of touchButtons) {
  button.addEventListener("click", () => {
    const direction = button.dataset.dir;
    handleDirectionInput(direction);
    boardEl.focus();
  });
}

boardEl.addEventListener("pointerdown", (event) => {
  if (typeof boardEl.setPointerCapture === "function") {
    try {
      boardEl.setPointerCapture(event.pointerId);
    } catch (_) {
      // Ignore capture failures on older browsers.
    }
  }
  touchStart = { x: event.clientX, y: event.clientY };
});

boardEl.addEventListener("pointerup", (event) => {
  if (!touchStart) return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  const threshold = 12;
  touchStart = null;

  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    handleDirectionInput(dx > 0 ? "right" : "left");
  } else {
    handleDirectionInput(dy > 0 ? "down" : "up");
  }
});

boardEl.addEventListener("pointercancel", () => {
  touchStart = null;
});

boardEl.addEventListener("click", () => {
  boardEl.focus();
});

// Touch fallback for browsers with spotty Pointer Events behavior.
boardEl.addEventListener(
  "touchstart",
  (event) => {
    const firstTouch = event.changedTouches[0];
    if (!firstTouch) return;
    touchStart = { x: firstTouch.clientX, y: firstTouch.clientY };
  },
  { passive: true }
);

boardEl.addEventListener(
  "touchend",
  (event) => {
    if (!touchStart) return;
    const firstTouch = event.changedTouches[0];
    if (!firstTouch) return;

    const dx = firstTouch.clientX - touchStart.x;
    const dy = firstTouch.clientY - touchStart.y;
    const threshold = 12;
    touchStart = null;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleDirectionInput(dx > 0 ? "right" : "left");
    } else {
      handleDirectionInput(dy > 0 ? "down" : "up");
    }
  },
  { passive: true }
);

buildBoard();
render();
startLoop();
