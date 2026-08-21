const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");
const highScoreDisplay = document.getElementById("highScore");

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [{ x: 10, y: 10 }];
let velocity = { x: 0, y: 0 };
let food = { x: 5, y: 5 };
let score = 0;
let highScore = Number(localStorage.getItem("snakeHighScore")) || 0;
let gameRunning = false;
let gameOver = false;

async function saveSnakeScoreToBackend(finalScore) {
  if (finalScore <= 0) {
    return;
  }

  try {
    await fetch("http://localhost:3000/scores", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        gameName: "snake",
        score: finalScore
      })
    });
  } catch (error) {
    console.error("Failed to save Snake score:", error);
  }
}

highScoreDisplay.textContent = "High Score: " + highScore;

function placeFood() {
  let newFood;
  let foodOnSnake;

  do {
    newFood = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount)
    };

    foodOnSnake = snake.some(part => part.x === newFood.x && part.y === newFood.y);
  } while (foodOnSnake);

  food = newFood;
}

function startGame() {
  if (!gameRunning) {
    gameRunning = true;
    gameOver = false;
  }
}

function resetGame() {
  snake = [{ x: 10, y: 10 }];
  velocity = { x: 0, y: 0 };
  score = 0;
  gameRunning = false;
  gameOver = false;
  scoreDisplay.textContent = "Score: 0";
  placeFood();
  draw();
}

function endGame() {
  gameRunning = false;
  gameOver = true;

  if (score > 0) {
    saveSnakeScoreToBackend(score);
  }

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("snakeHighScore", highScore);
    highScoreDisplay.textContent = "High Score: " + highScore;
  }
}

function gameLoop() {
  if (gameRunning) {
    update();
  }
  draw();
}

function update() {
  const head = {
    x: snake[0].x + velocity.x,
    y: snake[0].y + velocity.y
  };

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreDisplay.textContent = "Score: " + score;
    placeFood();
  } else {
    snake.pop();
  }

  if (
    head.x < 0 ||
    head.x >= tileCount ||
    head.y < 0 ||
    head.y >= tileCount
  ) {
    endGame();
    return;
  }

  for (let i = 1; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      endGame();
      return;
    }
  }
}

function drawCenteredText(text, y) {
  ctx.fillStyle = "#f4f7ff";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, y);
}

function draw() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#39ffea";
  snake.forEach(part => {
    ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 2, gridSize - 2);
  });

  ctx.fillStyle = "#ff5ccf";
  ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);

  if (!gameRunning && !gameOver) {
    drawCenteredText("Press Space to Start", canvas.height / 2);
  }

  if (gameOver) {
    drawCenteredText("Game Over", canvas.height / 2 - 10);
    ctx.font = "18px Arial";
    ctx.fillStyle = "#ffe066";
    ctx.textAlign = "center";
    ctx.fillText("Press Space to Restart", canvas.width / 2, canvas.height / 2 + 24);
  }
}

document.addEventListener("keydown", function (e) {
  if (e.code === "Space") {
    if (gameOver) {
      resetGame();
      startGame();
      velocity = { x: 1, y: 0 };
      return;
    }

    if (!gameRunning) {
      startGame();
      if (velocity.x === 0 && velocity.y === 0) {
        velocity = { x: 1, y: 0 };
      }
    }
    return;
  }

  if (!gameRunning) {
    return;
  }

  switch (e.key) {
    case "ArrowUp":
      if (velocity.y === 1) break;
      velocity = { x: 0, y: -1 };
      break;
    case "ArrowDown":
      if (velocity.y === -1) break;
      velocity = { x: 0, y: 1 };
      break;
    case "ArrowLeft":
      if (velocity.x === 1) break;
      velocity = { x: -1, y: 0 };
      break;
    case "ArrowRight":
      if (velocity.x === -1) break;
      velocity = { x: 1, y: 0 };
      break;
  }
});

placeFood();
draw();
setInterval(gameLoop, 120);