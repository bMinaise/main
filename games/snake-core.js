export const GRID_SIZE = 20;

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

function randomInt(max, randomFn) {
  return Math.floor(randomFn() * max);
}

export function placeFood(snake, gridSize = GRID_SIZE, randomFn = Math.random) {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const available = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) available.push({ x, y });
    }
  }

  if (available.length === 0) return null;
  return available[randomInt(available.length, randomFn)];
}

export function createInitialState(options = {}) {
  const gridSize = options.gridSize ?? GRID_SIZE;
  const randomFn = options.randomFn ?? Math.random;
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
    didGrow: false,
  };
}

export function setDirection(state, requestedDirection) {
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

export function togglePause(state) {
  if (state.status === "game-over") return state;
  return { ...state, status: state.status === "paused" ? "running" : "paused" };
}

export function restart(state, randomFn = Math.random) {
  return createInitialState({ gridSize: state.gridSize, randomFn });
}

export function tick(state, randomFn = Math.random) {
  if (state.status !== "running") return state;

  const move = DIRS[state.nextDirection];
  const head = state.snake[0];
  const newHead = { x: head.x + move.x, y: head.y + move.y };

  const outOfBounds =
    newHead.x < 0 ||
    newHead.y < 0 ||
    newHead.x >= state.gridSize ||
    newHead.y >= state.gridSize;

  if (outOfBounds) {
    return { ...state, status: "game-over", didGrow: false };
  }

  const ateFood = state.food && sameCell(newHead, state.food);
  const bodyToCheck = ateFood ? state.snake : state.snake.slice(0, -1);
  const hitSelf = bodyToCheck.some((segment) => sameCell(segment, newHead));

  if (hitSelf) {
    return { ...state, status: "game-over", didGrow: false };
  }

  const nextSnake = [newHead, ...state.snake];
  if (!ateFood) nextSnake.pop();

  const nextFood = ateFood ? placeFood(nextSnake, state.gridSize, randomFn) : state.food;
  const isBoardFull = !nextFood;

  return {
    ...state,
    snake: nextSnake,
    direction: state.nextDirection,
    nextDirection: state.nextDirection,
    food: nextFood,
    score: ateFood ? state.score + 1 : state.score,
    status: isBoardFull ? "game-over" : state.status,
    didGrow: ateFood,
  };
}
